import db from '../db/index.js';

function generateBuffer(j = 32) {
    const buffer = Buffer.alloc(j);
    for (let i = 0; i < j; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer.toString('base64url').replace(/=/g, '');
}

function base64UrlEncode(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

import crypto from 'crypto';
import { frontier, sessions, tokens, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { carrier, profile } from './cAPIs.js';

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

const FRONTIER_AUTH_SERVER = 'https://auth.frontierstore.net';
const FRONTIER_CLIENT_ID = process.env.FRONTIER_CLIENT_ID;
const BASE_URL = process.env.BASE_URL;

console.log('OAuth BASEURL', BASE_URL);

export async function createOAuthSession(user_id, redirect_uri = null) {
    const id = BigInt(user_id);
    const state = generateBuffer();
    const codeVerifier = generateBuffer();
    const codeChallenge = base64UrlEncode(sha256(codeVerifier));

    const sessionId = crypto.randomUUID();

    const finalRedirectUri = redirect_uri || `${BASE_URL}/${sessionId}/callback`;

    await db.insert(sessions).values({
        session_id: sessionId,
        user_id: id,
        state,
        redirectUri: finalRedirectUri,
        codeVerifier
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
        .from(sessions)
        .where(eq(sessions.session_id, sessionId))
        .limit(1);

    if (!session) {
        throw new Error('Invalid Session');
    }

    if (session.state != state) {
        throw new Error('State mismatch - Possible CSRF attack');
    }

    const tokenData = await exchangeCodeForToken(code, session.codeVerifier, session.redirectUri);

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const profileData = await profile(tokenData.access_token);

    const [access_result] = await db.insert(tokens).values({
        user_id: session.user_id,
        frontier_id: profileData.commander?.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refreshToken,
        tokenType: tokenData.token_type,
        expiresAt,
        scope: tokenData.scope
    }).onConflictDoUpdate({
        set: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refreshToken,
            tokenType: tokenData.token_type,
            expiresAt,
            scope: tokenData.scope
        },
        target: [tokens.user_id, tokens.frontier_id],
    });

    const carrierData = await carrier(tokenData.accessToken);

    const [cmdr_result] = await db.insert(frontier).values({
        id: profileData.commander?.id,
        cmdrName: profileData.commander?.name,
        carrierName: carrierData.name?.name,
        carrierId: carrierData.name?.callsign,
        shipName: profileData.ship?.shipName,
        credits: profileData.commander?.credits
    }).onConflictDoUpdate({
        set: {
            cmdrName: profileData.commander?.name,
            carrierName: carrierData.name?.name,
            shipName: profileData.ship?.shipName,
            credits: profileData.commander?.credits
        },
        target: frontier.id
    });

    // Set this account as the new Default
    await db
        .update(users)
        .set({
            selectedFrontierId: profileData.commander?.id
        }).where(eq(users.id, session.user_id));

    try {
        const cacheKey = `profile:${profileData.commander?.id}:live`;
        const redis = (await import('./redis.js')).default;
        await redis.setex(cacheKey, 900, JSON.stringify(profileData));
    } catch (e) {
        console.warn('Could not cache carrier:', e);
    }

    try {
        const cacheKey = `fleetcarrier:${profileData.commander?.id}:live`;
        const redis = (await import('./redis.js')).default;
        await redis.setex(cacheKey, 900, JSON.stringify(carrierData));
    } catch (e) {
        console.warn('Could not cache carrier:', e);
    }

    return { cmdr_result, access_result };

}

async function exchangeCodeForToken(code, codeVerifier, redirectUri) {
    const response = await fetch(`${FRONTIER_AUTH_SERVER}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: FRONTIER_CLIENT_ID,
            code_verifier: codeVerifier,
            code,
            redirect_uri: redirectUri
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error('Token Exchange failed: ' + error);
    }

    return response.json();
}

export async function refreshAccessToken(refresh_token) {

    console.log('Refreshing', refresh_token);

    const response = await fetch(`${FRONTIER_AUTH_SERVER}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: FRONTIER_CLIENT_ID,
            refresh_token
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error('Token refresh failed: ' + error);
    }

    return response.json();

}

const CAPI_SERVER_LIVE = 'https://companion.orerve.net';
const CAPI_SERVER_BETA = 'https://pts-companion.orerve.net';

export async function fetchCapi(endpoint, access_token, isBeta = false) {

    const server = isBeta ? CAPI_SERVER_BETA : CAPI_SERVER_LIVE;

    const controller = new AbortController();
    // 30s is enough
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${server}/${endpoint}`, {
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'User-Agent': 'EDFC/1.0',
            },
            // The more you know
            'signal': controller.signal
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error('CAPI Error: ' + error);
        }

        return await response.json();

    } finally {
        clearTimeout(timeoutId);
    }

}