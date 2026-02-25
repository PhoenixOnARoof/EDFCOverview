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

    if (interaction.isCommand()) {

        const { commandName } = interaction;
        const command = client.commands.get(commandName);

        if (!command) return;

        try {
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

import { handleOAuthCallback } from './utils/oauth.js';
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