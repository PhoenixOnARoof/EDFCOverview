import 'dotenv/config';
import express from 'express';
import { InteractionType, InteractionResponseType, verifyKeyMiddleware } from 'discord-interactions';
import {
  VerifyDiscordRequest,
  createFleetCarrierEmbed,
  createCommanderEmbed,
  createMarketEmbed,
  createShipyardEmbed,
  createCommunityGoalsEmbed,
  createShipsEmbed,
  createSquadronEmbed,
  createStarportEmbed,
  createLastSystemEmbed,
} from './utils.js';
import { handleOAuthCallback, getValidAccessToken, getFleetCarrier, getCommanderProfile, getMarket, getShipyard, getCommunityGoals, getJournal, isLoggedIn, createOAuthSession, revokeOAuthToken } from './oauth.js';

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
  const discordUserId = req.body.user?.id || req.body.member?.user?.id;

  console.log(type, data, { discordUserId });

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

    if (name === 'logout') {
      const userLoggedIn = await isLoggedIn(discordUserId);

      if (!userLoggedIn) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'You are not logged in!',
            flags: 64,
          },
        });
      }

      await revokeOAuthToken(discordUserId);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'You have been logged out successfully. Your Frontier account has been unlinked.',
          flags: 64,
        },
      });
    }

    if (name === 'carrier') {
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

    if (name === 'profile') {
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
        const profile = await getCommanderProfile(discordUserId);

        if (!profile || !profile.commander) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch commander profile. Please try again.',
              flags: 64,
            },
          });
        }

        const commanderEmbed = createCommanderEmbed(profile.commander);
        const interactionContext = req.body.context;

        let payloadData = {
          embeds: [commanderEmbed],
        };

        if (interactionContext !== 1) {
          payloadData.flags = 64;
          payloadData.components = [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  label: 'Share Profile',
                  custom_id: 'share_profile',
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
        console.error('Profile error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching profile: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'market') {
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
        const market = await getMarket(discordUserId);

        if (!market) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch market data. Please try again.',
              flags: 64,
            },
          });
        }

        const marketEmbed = createMarketEmbed(market);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [marketEmbed],
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Market error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching market: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'shipyard') {
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
        const shipyard = await getShipyard(discordUserId);

        if (!shipyard) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch shipyard data. Please try again.',
              flags: 64,
            },
          });
        }

        const shipyardEmbed = createShipyardEmbed(shipyard);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [shipyardEmbed],
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Shipyard error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching shipyard: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'communitygoals') {
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
        const goals = await getCommunityGoals(discordUserId);

        if (!goals) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch community goals. Please try again.',
              flags: 64,
            },
          });
        }

        const goalsEmbed = createCommunityGoalsEmbed(goals);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [goalsEmbed],
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Community goals error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching community goals: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'journal') {
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
        const journal = await getJournal(discordUserId);

        if (!journal) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch journal data. Please try again.',
              flags: 64,
            },
          });
        }

        const eventCount = Array.isArray(journal) ? journal.length : 0;

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Journal fetched successfully. ${eventCount} event(s) found.`,
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Journal error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching journal: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'ships') {
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
        const profile = await getCommanderProfile(discordUserId);

        if (!profile || !profile.commander) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch ships data. Please try again.',
              flags: 64,
            },
          });
        }

        const shipsEmbed = createShipsEmbed(profile);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [shipsEmbed],
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Ships error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching ships: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'squadron') {
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
        const profile = await getCommanderProfile(discordUserId);

        if (!profile || !profile.commander) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch squadron data. Please try again.',
              flags: 64,
            },
          });
        }

        const squadronEmbed = createSquadronEmbed(profile);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [squadronEmbed],
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Squadron error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching squadron: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'laststarport') {
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
        const profile = await getCommanderProfile(discordUserId);

        if (!profile || !profile.commander) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch starport data. Please try again.',
              flags: 64,
            },
          });
        }

        const starportEmbed = createStarportEmbed(profile);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [starportEmbed],
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Starport error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching starport: ${error.message}`,
            flags: 64,
          },
        });
      }
    }

    if (name === 'lastsystem') {
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
        const profile = await getCommanderProfile(discordUserId);

        if (!profile || !profile.commander) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch system data. Please try again.',
              flags: 64,
            },
          });
        }

        const systemEmbed = createLastSystemEmbed(profile);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [systemEmbed],
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Last system error:', error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Error fetching system: ${error.message}`,
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

    if (customId === 'share_profile') {
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
        const profile = await getCommanderProfile(discordUserId);

        if (!profile || !profile.commander) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: 'Unable to fetch commander profile.',
            },
          });
        }

        const commanderEmbed = createCommanderEmbed(profile.commander);

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [commanderEmbed],
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
