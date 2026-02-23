import 'dotenv/config';
import express from 'express';
import { InteractionType, InteractionResponseType, verifyKeyMiddleware } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  createFleetCarrierEmbed,
} from './utils.js';
import { handleOAuthCallback, getValidAccessToken, getFleetCarrier, isLoggedIn, createOAuthSession } from './oauth.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 8087;

app.use(express.json());

app.get('/edfc/:sessionId/callback', async (req, res) => {
  const { sessionId } = req.params;
  const { code, state } = req.query;

  console.log('OAuth callback:', { sessionId, code: !!code, state: !!state });

  try {
    await handleOAuthCallback(sessionId, code, state);
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background: #1a1a2e; 
              color: #fff; 
            }
            .container { text-align: center; padding: 40px; background: #16213e; border-radius: 10px; }
            h1 { color: #4ade80; }
            p { color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Successful!</h1>
            <p>Your Frontier account has been linked.</p>
            <p>You can close this window.</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background: #1a1a2e; 
              color: #fff; 
            }
            .container { text-align: center; padding: 40px; background: #16213e; border-radius: 10px; }
            h1 { color: #ef4444; }
            p { color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Authentication Failed</h1>
            <p>${error.message}</p>
          </div>
        </body>
      </html>
    `);
  }
});

app.use(verifyKeyMiddleware(process.env.PUBLIC_KEY));

app.post('/edfc/interactions', async function (req, res) {
  const { type, data } = req.body;
  const discordUserId = req.body.user?.id;

  console.log(type, data);

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'login') {
      const userLoggedIn = await isLoggedIn(discordUserId);

      if (userLoggedIn) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'You are already logged in!',
            flags: 64,
          },
        });
      }

      const { sessionId, authUrl } = await createOAuthSession(discordUserId);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Click the button below to link your Frontier account:',
          flags: 64,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  label: 'Link Frontier Account',
                  style: 5,
                  url: authUrl,
                },
              ],
            },
          ],
        },
      });
    }

    if (name === 'fleetcarrier') {
      const userLoggedIn = await isLoggedIn(discordUserId);

      if (!userLoggedIn) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'You need to login first! Use `/login` to link your Frontier account.',
            flags: 64,
          },
        });
      }

      try {
        const fc = await getFleetCarrier(discordUserId);

        if (!fc) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch fleet carrier data. Please try again.',
              flags: 64,
            },
          });
        }

        const fcEmbed = createFleetCarrierEmbed(fc);
        const interactionContext = req.body.context;

        let payloadData = {
          embeds: [fcEmbed],
        };

        if (interactionContext !== 1) {
          payloadData.flags = 64;
          payloadData.components = [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  label: 'Share Fleet Carrier',
                  custom_id: 'share_fleetcarrier',
                  style: 2,
                },
              ],
            },
          ];
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: payloadData,
        });
      } catch (error) {
        console.error('Fleet carrier error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching fleet carrier: ${error.message}`,
            flags: 64,
          },
        });
      }
    }
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const customId = data.custom_id;

    if (customId === 'share_fleetcarrier') {
      const userLoggedIn = await isLoggedIn(discordUserId);

      if (!userLoggedIn) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'You need to login first! Use `/login` to link your Frontier account.',
            flags: 64,
          },
        });
      }

      try {
        const fc = await getFleetCarrier(discordUserId);

        if (!fc) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch fleet carrier data.',
            },
          });
        }

        const fcEmbed = createFleetCarrierEmbed(fc);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [fcEmbed],
          },
        });
      } catch (error) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error: ${error.message}`,
          },
        });
      }
    }
  }
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
