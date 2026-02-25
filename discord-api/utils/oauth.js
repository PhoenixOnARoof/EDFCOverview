import db from '../db/index.js';

function generateBuffer(i = 32) {
    const buffer = Buffer.alloc(i);
    for (let i = 0; i < i; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer.toString('base64url').replace(/=/g, '');
}

function base64UrlEncode(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

import crypto from 'crypto';
import { sessions } from '../db/schema.js';

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

const FRONTIER_AUTH_SERVER = 'https://auth.frontierstore.net';
const FRONTIER_CLIENT_ID = process.env.FRONTIER_CLIENT_ID;
const BASE_URL = process.env.BASE_URL;

console.log('OAuth BASEURL', BASE_URL);

export async function createOAuthSession(id, redirect_uri = null) {
    const id = BigInt(id);
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