import 'dotenv/config';

import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import { initializeCommands } from './utils/initializeCommands.js';
import { InteractionResponseFlags } from 'discord-interactions';

export const client = new Client({
  intents: [
    // GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages
  ]
});

client.commands = new Map();

client.on('ready', async () => {
  console.log(`${client.user.tag} ready to fly`);
  await initializeCommands(client);
});

client.on('interactionCreate', async (interaction) => {

  console.log(interaction.commandName, interaction.commandType);

  const id = BigInt(interaction.user.id);

  if (interaction.isCommand()) {

    const { commandName } = interaction;
    const command = client.commands.get(commandName);

    if (!command) return;

    try {

      if (command.login_required) {

        await interaction.deferReply();

        const [user] = await db.select({ selectedFrontierId: users.selectedFrontierId }).from(users).where(eq(users.id, id));

        if (!user) {
          const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Not Logged In')
            .setDescription('You need to login first! Use `/login` to link your Frontier account.');

          return interaction.editReply({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });
        }

        const [token] = await db.select({ expires_at: tokens.expiresAt, refreshToken: tokens.refreshToken, accessToken: tokens.accessToken }).from(tokens).where(and(eq(tokens.user_id, id), eq(tokens.frontier_id, user.selectedFrontierId)));

        if (!token) {

          const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Your Token expired... Please login again.')
            .setDescription('You need to login first! Use `/login` to link your Frontier account.');

          return interaction.editReply({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });

        }

        interaction.user.expires_at = token.expires_at;
        interaction.user.access_token = token.accessToken;

        if (token.expires_at.getTime() <= Date.now()) {

          try {

            // Refresh Access Token
            const newRefresh = await refreshAccessToken(token.refreshToken);

            await db
              .update(tokens)
              .set({
                accessToken: newRefresh.access_token,
                refreshToken: newRefresh.refresh_token,
                tokenType: newRefresh.token_type,
                expiresAt: new Date(Date.now() + newRefresh.expires_in * 1000)
              })
              .where(and(eq(tokens.user_id, id), eq(tokens.frontier_id, user.selectedFrontierId)));

            interaction.user.expires_at = new Date(Date.now() + newRefresh.expires_in * 1000);
            interaction.user.access_token = newRefresh.access_token;

          } catch (error) {

            console.error(error);

            await db.delete(tokens)
              .where(and(eq(tokens.user_id, id), eq(tokens.frontier_id, user.selectedFrontierId)));

            const embed = new EmbedBuilder()
              .setColor(0xef4444)
              .setTitle('Your Token expired... Please login again.')
              .setDescription('You need to login first! Use `/login` to link your Frontier account.');

            if (interaction.replied || interaction.deferred) {
              await interaction.editReply({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });
            } else
              await interaction.reply({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });

          }

        }

        // Add to the User's Collection
        interaction.user.selectedFrontierId = user.selectedFrontierId;

      }

      await command.execute(interaction);

    } catch (error) {

      console.error('Command Error', error);

      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('An error occurred: ' + error.message);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });
      } else
        await interaction.reply({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });

    }

  }

});


import express from 'express';

const app = express();

app.use(express.json());

import { handleOAuthCallback, refreshAccessToken } from './utils/oauth.js';
import db from './db/index.js';
import { tokens, users } from './db/schema.js';
import { and, eq } from 'drizzle-orm';
app.get('/edfc/:sessionId/callback', async (req, res) => {

  const { sessionId } = req.params;
  const { code, state } = req.query;

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

const PORT = process.env.PORT || 8087;

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});


client.login(process.env.DISCORD_TOKEN);