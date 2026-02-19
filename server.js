require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const open = require('open');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const AUTH_PORT = process.env.AUTH_PORT || 9000;
const CLIENT_ID = process.env.CLIENT_ID || 'fb88d428-9110-475f-a3d2-dc151c2b9c7a';
const FRONTIER_AUTH_SERVER = 'https://auth.frontierstore.net';

const sessions = new Map();

function generateVerifier() {
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

async function initiateAuth(cmdr, isBeta = false) {
    const state = generateState();
    const verifier = generateVerifier();
    const challenge = base64UrlEncode(sha256(verifier));

    const sessionId = uuidv4();
    const redirectUri = `http://localhost:${AUTH_PORT}/callback?sessionId=${sessionId}`;

    sessions.set(sessionId, {
        cmdr,
        isBeta,
        state,
        verifier,
        redirectUri,
        createdAt: Date.now()
    });

    const authUrl = `${FRONTIER_AUTH_SERVER}/auth?` +
        `response_type=code&` +
        `audience=frontier,steam,epic&` +
        `scope=auth%20capi&` +
        `client_id=${CLIENT_ID}&` +
        `code_challenge=${challenge}&` +
        `code_challenge_method=S256&` +
        `state=${state}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`;

    return { authUrl, sessionId };
}

async function exchangeCodeForToken(code, verifier, redirectUri) {
    const response = await axios.post(`${FRONTIER_AUTH_SERVER}/token`,
        new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            code_verifier: verifier,
            code: code,
            redirect_uri: redirectUri
        }), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data;
}

async function decodeToken(accessToken) {
    const response = await axios.get(`${FRONTIER_AUTH_SERVER}/decode`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
}

const CAPI_SERVER_LIVE = 'https://companion.orerve.net';
const CAPI_SERVER_LEGACY = 'https://legacy-companion.orerve.net';
const CAPI_SERVER_BETA = 'https://pts-companion.orerve.net';

function getCapiServer(isBeta, isLiveGalaxy = true) {
    if (isBeta) return CAPI_SERVER_BETA;
    return isLiveGalaxy ? CAPI_SERVER_LIVE : CAPI_SERVER_LEGACY;
}

async function capiQuery(accessToken, endpoint, isBeta = false, isLiveGalaxy = true) {
    const server = getCapiServer(isBeta, isLiveGalaxy);
    const response = await axios.get(`${server}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'EDMC-API/1.0'
        },
        timeout: 30000
    });
    return response.data;
}

app.post('/auth/start', async (req, res) => {
    try {
        const { cmdr, isBeta } = req.body;
        const { authUrl, sessionId } = await initiateAuth(cmdr, isBeta);

        res.json({
            authUrl,
            sessionId,
            message: 'Open the authUrl in your browser to login'
        });
    } catch (error) {
        console.error('Auth error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to initiate auth', details: error.message });
    }
});

app.get('/auth/callback', async (req, res) => {
    try {
        const { code, state, sessionId } = req.query;

        console.log("> DEBUG:");
        console.log(req.query);
        sessions.forEach(console.log);

        const session = sessions.get(sessionId);
        if (!session) {
            return res.status(400).json({ error: 'Invalid session' });
        }

        if (session.state !== state) {
            return res.status(400).json({ error: 'State mismatch' });
        }

        const tokenData = await exchangeCodeForToken(code, session.verifier, session.redirectUri);
        const decoded = await decodeToken(tokenData.access_token);

        session.accessToken = tokenData.access_token;
        session.customerId = decoded.usr?.customer_id;
        session.expiresAt = Date.now() + (tokenData.expires_in * 1000);

        res.json({
            success: true,
            sessionId,
            message: 'Authentication successful! You can close this window and use the API.'
        });
    } catch (error) {
        console.error('Callback error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
});

app.get('/auth/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session || !session.accessToken) {
        return res.status(404).json({ authenticated: false });
    }

    res.json({
        authenticated: true,
        cmdr: session.cmdr,
        isBeta: session.isBeta,
        expiresAt: session.expiresAt
    });
});

app.get('/api/profile/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessions.get(sessionId);

        if (!session || !session.accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const data = await capiQuery(session.accessToken, '/profile', session.isBeta);
        res.json(data);
    } catch (error) {
        console.error('Profile error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get profile', details: error.message });
    }
});

app.get('/api/fleetcarrier/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessions.get(sessionId);

        if (!session || !session.accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const data = await capiQuery(session.accessToken, '/fleetcarrier', session.isBeta);
        res.json(data);
    } catch (error) {
        console.error('Fleet carrier error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get fleet carrier', details: error.message });
    }
});

app.get('/api/market/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { marketId } = req.query;
        const session = sessions.get(sessionId);

        if (!session || !session.accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const data = await capiQuery(session.accessToken, `/market`, session.isBeta);
        res.json(data);
    } catch (error) {
        console.error('Market error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get market', details: error.message });
    }
});

app.get('/api/shipyard/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessions.get(sessionId);

        if (!session || !session.accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const data = await capiQuery(session.accessToken, '/shipyard', session.isBeta);
        res.json(data);
    } catch (error) {
        console.error('Shipyard error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get shipyard', details: error.message });
    }
});

app.get('/api/station/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = sessions.get(sessionId);

        if (!session || !session.accessToken) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const profile = await capiQuery(session.accessToken, '/profile', session.isBeta);

        const result = { ...profile };

        if (profile.lastStarport?.services?.commodities) {
            const market = await capiQuery(session.accessToken, '/market', session.isBeta);
            result.market = market;
        }

        if (profile.lastStarport?.services?.outfitting || profile.lastStarport?.services?.shipyard) {
            const shipyard = await capiQuery(session.accessToken, '/shipyard', session.isBeta);
            result.shipyard = shipyard;
        }

        res.json(result);
    } catch (error) {
        console.error('Station error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get station data', details: error.message });
    }
});

app.post('/auth/logout/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    sessions.delete(sessionId);
    res.json({ success: true, message: 'Logged out' });
});

app.get('/sessions', (req, res) => {
    const activeSessions = [];
    for (const [id, session] of sessions) {
        activeSessions.push({
            sessionId: id,
            cmdr: session.cmdr,
            isBeta: session.isBeta,
            authenticated: !!session.accessToken
        });
    }
    res.json({ sessions: activeSessions });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel.html'));
});

app.get('/api/docs', (req, res) => {
    res.json({
        name: 'EDMC API',
        version: '1.0.0',
        endpoints: {
            'POST /auth/start': 'Start authentication - body: { cmdr: string, isBeta?: boolean }',
            'GET /auth/callback': 'OAuth callback - receives code and state',
            'GET /auth/status/:sessionId': 'Check authentication status',
            'GET /api/profile/:sessionId': 'Get commander profile',
            'GET /api/fleetcarrier/:sessionId': 'Get fleet carrier data',
            'GET /api/market/:sessionId': 'Get market data',
            'GET /api/shipyard/:sessionId': 'Get shipyard data',
            'GET /api/station/:sessionId': 'Get full station data (profile + market + shipyard)',
            'POST /auth/logout/:sessionId': 'Logout and clear session',
            'GET /sessions': 'List active sessions'
        }
    });
});

const authApp = express();
authApp.use(cors());
authApp.use(express.json());

authApp.get('/callback', async (req, res) => {
    const { code, state, sessionId } = req.query;

    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(400).send('Invalid session. Please restart authentication.');
    }

    if (session.state !== state) {
        return res.status(400).send('State mismatch. Possible CSRF attack.');
    }

    try {
        const tokenData = await exchangeCodeForToken(code, session.verifier, session.redirectUri);
        const decoded = await decodeToken(tokenData.access_token);

        session.accessToken = tokenData.access_token;
        session.refreshToken = tokenData.refresh_token;
        session.customerId = decoded.usr?.customer_id;
        session.expiresAt = Date.now() + (tokenData.expires_in * 1000);

        res.send(`
            <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e; color: #fff; }
                        .container { text-align: center; padding: 40px; background: #16213e; border-radius: 10px; }
                        h1 { color: #4ade80; }
                        p { color: #94a3b8; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Authentication Successful!</h1>
                        <p>You can now use the API with session ID: <strong>${sessionId}</strong></p>
                        <p>Copy this session ID and use it in your API requests.</p>
                    </div>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).send('Authentication failed. Please try again.');
    }
});

authApp.listen(AUTH_PORT, () => {
    console.log(`Auth callback server running on http://localhost:${AUTH_PORT}`);
});

app.listen(PORT, () => {
    console.log(`EDMC API server running on http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/`);
});

module.exports = app;
