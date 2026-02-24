import { db } from '../../db/index.js';
import { discordOAuthSessions, discordOAuthTokens, discordUserSettings } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getCached, invalidateUserCache } from './cache.js';

const FRONTIER_AUTH_SERVER = 'https://auth.frontierstore.net';
const FRONTIER_CLIENT_ID = process.env.FRONTIER_CLIENT_ID;
const BASE_URL = process.env.BASE_URL || 'https://pokedi.xyz/edfc';

function generateCodeVerifier() {
  const buffer = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer.toString('base64url').replace(/=/g, '');
}

function generateState() {
  const buffer = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) {
    buffer[i] = Math.floor(Math.random() * 256);
  }
  return buffer.toString('base64url').replace(/=/g, '');
}

function base64UrlEncode(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

import crypto from "crypto";

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

async function exchangeCodeForToken(code, codeVerifier, redirectUri) {
  const response = await fetch(`${FRONTIER_AUTH_SERVER}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: FRONTIER_CLIENT_ID,
      code_verifier: codeVerifier,
      code: code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${FRONTIER_AUTH_SERVER}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: FRONTIER_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

export async function createOAuthSession(discordUserId, redirectUri = null) {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = base64UrlEncode(sha256(codeVerifier));

  const sessionId = crypto.randomUUID();
  
  const finalRedirectUri = redirectUri || `${BASE_URL}/${sessionId}/callback`;

  await db.insert(discordOAuthSessions).values({
    sessionId,
    discordUserId,
    state,
    redirectUri: finalRedirectUri,
    codeVerifier,
  });

  const authUrl = `${FRONTIER_AUTH_SERVER}/auth?` +
    `response_type=code&` +
    `audience=frontier,steam,epic&` +
    `scope=auth%20capi&` +
    `client_id=${FRONTIER_CLIENT_ID}&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256&` +
    `state=${state}&` +
    `redirect_uri=${encodeURIComponent(finalRedirectUri)}`;

  return { sessionId, authUrl };
}

export async function handleOAuthCallback(sessionId, code, state) {
  const [session] = await db
    .select()
    .from(discordOAuthSessions)
    .where(eq(discordOAuthSessions.sessionId, sessionId))
    .limit(1);

  if (!session) {
    throw new Error('Invalid session');
  }

  if (session.state !== state) {
    throw new Error('State mismatch - possible CSRF attack');
  }

  const tokenData = await exchangeCodeForToken(code, session.codeVerifier, session.redirectUri);

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

  let customerId = null;
  let cmdrName = null;
  let profileData = null;
  let carrierData = null;
  let carrierName = null;
  let carrierId = null;
  
  try {
    const profileRes = await fetch('https://companion.orerve.net/profile', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    if (profileRes.ok) {
      profileData = await profileRes.json();
      customerId = profileData.commander?.id?.toString() || null;
      cmdrName = profileData.commander?.name || null;
    }
  } catch (e) {
    console.warn('Could not fetch profile:', e);
  }

  try {
    const carrierRes = await fetch('https://companion.orerve.net/fleetcarrier', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    if (carrierRes.ok) {
      carrierData = await carrierRes.json();
      carrierId = carrierData.name?.callsign || null;
      if (carrierData.name?.vanityName) {
        const buffer = Buffer.from(carrierData.name.vanityName, 'hex');
        carrierName = buffer.toString('utf8');
      }
    }
  } catch (e) {
    console.warn('Could not fetch carrier:', e);
  }

  const result = await db.insert(discordOAuthTokens).values({
    discordUserId: session.discordUserId,
    frontierCustomerId: customerId,
    cmdrName: cmdrName,
    carrierName: carrierName,
    carrierId: carrierId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refreshToken,
    tokenType: tokenData.token_type,
    expiresAt,
    scope: tokenData.scope,
  }).returning({ id: discordOAuthTokens.id });

  const newAccountId = result[0].id;

  const [existingSettings] = await db
    .select()
    .from(discordUserSettings)
    .where(eq(discordUserSettings.discordUserId, session.discordUserId))
    .limit(1);

  if (!existingSettings) {
    await db.insert(discordUserSettings).values({
      discordUserId: session.discordUserId,
      defaultAccountId: newAccountId,
    });
  } else if (!existingSettings.defaultAccountId) {
    await db
      .update(discordUserSettings)
      .set({ defaultAccountId: newAccountId, updatedAt: new Date() })
      .where(eq(discordUserSettings.discordUserId, session.discordUserId));
  }

  await db
    .delete(discordOAuthSessions)
    .where(eq(discordOAuthSessions.sessionId, sessionId));

  if (profileData) {
    const cacheKey = `profile:${session.discordUserId}:${newAccountId}:live`;
    try {
      const redis = (await import('./cache.js')).default;
      await redis.setex(cacheKey, 900, JSON.stringify(profileData));
    } catch (e) {
      console.warn('Could not cache profile:', e);
    }
  }

  if (carrierData) {
    const cacheKey = `fleetcarrier:${session.discordUserId}:${newAccountId}:live`;
    try {
      const redis = (await import('./cache.js')).default;
      await redis.setex(cacheKey, 900, JSON.stringify(carrierData));
    } catch (e) {
      console.warn('Could not cache carrier:', e);
    }
  }

  return { success: true, discordUserId: session.discordUserId, accountId: newAccountId };
}

export async function getUserAccounts(discordUserId) {
  return db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId))
    .orderBy(discordOAuthTokens.createdAt);
}

export async function getDefaultAccountId(discordUserId) {
  const [settings] = await db
    .select()
    .from(discordUserSettings)
    .where(eq(discordUserSettings.discordUserId, discordUserId))
    .limit(1);

  if (settings?.defaultAccountId) {
    return settings.defaultAccountId;
  }

  const [firstAccount] = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId))
    .limit(1);

  return firstAccount?.id || null;
}

export async function setDefaultAccount(discordUserId, accountId) {
  const accounts = await getUserAccounts(discordUserId);
  const validIds = accounts.map(a => a.id);
  
  if (!validIds.includes(accountId)) {
    throw new Error('Invalid account ID');
  }

  const [settings] = await db
    .select()
    .from(discordUserSettings)
    .where(eq(discordUserSettings.discordUserId, discordUserId))
    .limit(1);

  if (settings) {
    await db
      .update(discordUserSettings)
      .set({ defaultAccountId: accountId, updatedAt: new Date() })
      .where(eq(discordUserSettings.discordUserId, discordUserId));
  } else {
    await db.insert(discordUserSettings).values({
      discordUserId,
      defaultAccountId: accountId,
    });
  }

  return { success: true };
}

export async function removeAccount(discordUserId, accountId) {
  const accounts = await getUserAccounts(discordUserId);
  
  if (accounts.length <= 1) {
    throw new Error('Cannot remove last account');
  }

  await db
    .delete(discordOAuthTokens)
    .where(and(
      eq(discordOAuthTokens.id, accountId),
      eq(discordOAuthTokens.discordUserId, discordUserId)
    ));

  const [settings] = await db
    .select()
    .from(discordUserSettings)
    .where(eq(discordUserSettings.discordUserId, discordUserId))
    .limit(1);

  if (settings?.defaultAccountId === accountId) {
    const remainingAccounts = accounts.filter(a => a.id !== accountId);
    if (remainingAccounts.length > 0) {
      await db
        .update(discordUserSettings)
        .set({ defaultAccountId: remainingAccounts[0].id, updatedAt: new Date() })
        .where(eq(discordUserSettings.discordUserId, discordUserId));
    } else {
      await db
        .update(discordUserSettings)
        .set({ defaultAccountId: null, updatedAt: new Date() })
        .where(eq(discordUserSettings.discordUserId, discordUserId));
    }
  }

  return { success: true };
}

export async function getValidAccessToken(discordUserId, accountId = null, forceRefresh = false) {
  let targetAccountId = accountId;

  if (!targetAccountId) {
    targetAccountId = await getDefaultAccountId(discordUserId);
  }

  if (!targetAccountId) {
    return null;
  }

  const [tokenRecord] = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.id, targetAccountId))
    .limit(1);

  if (!tokenRecord) {
    return null;
  }

  const now = new Date();
  const needsRefresh = forceRefresh || tokenRecord.expiresAt <= new Date(now.getTime() + 5 * 60 * 1000);

  if (needsRefresh) {
    try {
      const newTokenData = await refreshAccessToken(tokenRecord.refreshToken);

      const newExpiresAt = new Date(Date.now() + newTokenData.expires_in * 1000);

      await db
        .update(discordOAuthTokens)
        .set({
          accessToken: newTokenData.access_token,
          refreshToken: newTokenData.refresh_token,
          tokenType: newTokenData.token_type,
          expiresAt: newExpiresAt,
          updatedAt: new Date(),
        })
        .where(eq(discordOAuthTokens.id, targetAccountId));

      return newTokenData.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await db
        .delete(discordOAuthTokens)
        .where(eq(discordOAuthTokens.id, targetAccountId));
      return null;
    }
  }

  return tokenRecord.accessToken;
}

export async function getOAuthToken(discordUserId, accountId = null) {
  let targetAccountId = accountId;

  if (!targetAccountId) {
    targetAccountId = await getDefaultAccountId(discordUserId);
  }

  if (!targetAccountId) {
    return null;
  }

  const [tokenRecord] = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.id, targetAccountId))
    .limit(1);

  return tokenRecord || null;
}

export async function revokeOAuthToken(discordUserId, accountId = null) {
  let targetAccountId = accountId;

  if (!targetAccountId) {
    targetAccountId = await getDefaultAccountId(discordUserId);
  }

  if (!targetAccountId) {
    return;
  }

  await invalidateUserCache(discordUserId);
  await db
    .delete(discordOAuthTokens)
    .where(and(
      eq(discordOAuthTokens.id, targetAccountId),
      eq(discordOAuthTokens.discordUserId, discordUserId)
    ));
}

export async function getOAuthSession(sessionId) {
  const [session] = await db
    .select()
    .from(discordOAuthSessions)
    .where(eq(discordOAuthSessions.sessionId, sessionId))
    .limit(1);

  return session || null;
}

const CAPI_SERVER_LIVE = 'https://companion.orerve.net';
const CAPI_SERVER_BETA = 'https://pts-companion.orerve.net';

async function fetchCapi(endpoint, accessToken, isBeta = false) {
  const server = isBeta ? CAPI_SERVER_BETA : CAPI_SERVER_LIVE;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${server}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'EDFC/1.0',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`CAPI error: ${response.status} - ${error}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getFleetCarrier(discordUserId, accountId = null, isBeta = false) {
  const cacheKey = `fleetcarrier:${discordUserId}:${accountId || 'default'}:${isBeta ? 'beta' : 'live'}`;
  
  return getCached(cacheKey, async () => {
    const accessToken = await getValidAccessToken(discordUserId, accountId);
    if (!accessToken) {
      return null;
    }
    return fetchCapi('/fleetcarrier', accessToken, isBeta);
  });
}

export async function getCommanderProfile(discordUserId, accountId = null, isBeta = false) {
  const cacheKey = `profile:${discordUserId}:${accountId || 'default'}:${isBeta ? 'beta' : 'live'}`;
  
  return getCached(cacheKey, async () => {
    const accessToken = await getValidAccessToken(discordUserId, accountId);
    if (!accessToken) {
      return null;
    }
    const profileData = await fetchCapi('/profile', accessToken, isBeta);

    if (profileData && accountId) {
      try {
        const carrierRes = await fetch(`${isBeta ? 'https://pts-companion.orerve.net' : 'https://companion.orerve.net'}/fleetcarrier`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (carrierRes.ok) {
          const carrierData = await carrierRes.json();
          let carrierName = null;
          let carrierId = null;
          
          carrierId = carrierData.name?.callsign || null;
          if (carrierData.name?.vanityName) {
            const buffer = Buffer.from(carrierData.name.vanityName, 'hex');
            carrierName = buffer.toString('utf8');
          }

          await db
            .update(discordOAuthTokens)
            .set({ 
              carrierName: carrierName,
              carrierId: carrierId,
              updatedAt: new Date() 
            })
            .where(eq(discordOAuthTokens.id, accountId));
        }
      } catch (e) {
        console.warn('Could not update carrier info:', e);
      }
    }

    return profileData;
  });
}

export async function getMarket(discordUserId, accountId = null, isBeta = false) {
  const cacheKey = `market:${discordUserId}:${accountId || 'default'}:${isBeta ? 'beta' : 'live'}`;
  
  return getCached(cacheKey, async () => {
    const accessToken = await getValidAccessToken(discordUserId, accountId);
    if (!accessToken) {
      return null;
    }
    return fetchCapi('/market', accessToken, isBeta);
  });
}

export async function getShipyard(discordUserId, accountId = null, isBeta = false) {
  const cacheKey = `shipyard:${discordUserId}:${accountId || 'default'}:${isBeta ? 'beta' : 'live'}`;
  
  return getCached(cacheKey, async () => {
    const accessToken = await getValidAccessToken(discordUserId, accountId);
    if (!accessToken) {
      return null;
    }
    return fetchCapi('/shipyard', accessToken, isBeta);
  });
}

export async function getCommunityGoals(discordUserId, accountId = null, isBeta = false) {
  const cacheKey = `communitygoals:${discordUserId}:${accountId || 'default'}:${isBeta ? 'beta' : 'live'}`;
  
  return getCached(cacheKey, async () => {
    const accessToken = await getValidAccessToken(discordUserId, accountId);
    if (!accessToken) {
      return null;
    }
    return fetchCapi('/communitygoals', accessToken, isBeta);
  });
}

export async function getJournal(discordUserId, accountId = null, isBeta = false, year = null, month = null, day = null) {
  const accessToken = await getValidAccessToken(discordUserId, accountId);
  
  if (!accessToken) {
    return null;
  }

  let endpoint = '/journal';
  if (year && month && day) {
    endpoint = `/journal/${year}/${month}/${day}`;
  }

  return fetchCapi(endpoint, accessToken, isBeta);
}

export async function getVisitedStars(discordUserId, accountId = null, isBeta = false) {
  const accessToken = await getValidAccessToken(discordUserId, accountId);
  
  if (!accessToken) {
    return null;
  }

  return fetchCapi('/visitedstars', accessToken, isBeta);
}

export async function isLoggedIn(discordUserId) {
  const accounts = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId))
    .limit(1);

  return !!accounts[0];
}

export async function hasMultipleAccounts(discordUserId) {
  const accounts = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId));

  return accounts.length > 1;
}
