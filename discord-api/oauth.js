import { db } from './db/index.js';
import { discordOAuthSessions, discordOAuthTokens } from './db/schema.js';
import { eq, and } from 'drizzle-orm';

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

function sha256(buffer) {
  const crypto = require('crypto');
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

  await db.insert(discordOAuthTokens).values({
    discordUserId: session.discordUserId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenType: tokenData.token_type,
    expiresAt,
    scope: tokenData.scope,
  }).onConflictDoUpdate({
    target: discordOAuthTokens.discordUserId,
    set: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresAt,
      scope: tokenData.scope,
      updatedAt: new Date(),
    },
  });

  await db
    .delete(discordOAuthSessions)
    .where(eq(discordOAuthSessions.sessionId, sessionId));

  return { success: true, discordUserId: session.discordUserId };
}

export async function getValidAccessToken(discordUserId, forceRefresh = false) {
  const [tokenRecord] = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId))
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
        .where(eq(discordOAuthTokens.discordUserId, discordUserId));

      return newTokenData.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await db
        .delete(discordOAuthTokens)
        .where(eq(discordOAuthTokens.discordUserId, discordUserId));
      return null;
    }
  }

  return tokenRecord.accessToken;
}

export async function getOAuthToken(discordUserId) {
  const [tokenRecord] = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId))
    .limit(1);

  return tokenRecord || null;
}

export async function revokeOAuthToken(discordUserId) {
  await db
    .delete(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId));
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

export async function getFleetCarrier(discordUserId, isBeta = false) {
  const accessToken = await getValidAccessToken(discordUserId);
  
  if (!accessToken) {
    return null;
  }

  return fetchCapi('/fleetcarrier', accessToken, isBeta);
}

export async function isLoggedIn(discordUserId) {
  const [tokenRecord] = await db
    .select()
    .from(discordOAuthTokens)
    .where(eq(discordOAuthTokens.discordUserId, discordUserId))
    .limit(1);

  return !!tokenRecord;
}
