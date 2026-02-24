import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { initializeCommands } from './commands/index.js';
import { 
  handleOAuthCallback, 
  getCommanderProfile, 
  getFleetCarrier, 
  getMarket, 
  getShipyard, 
  getCommunityGoals, 
  getJournal 
} from './services/oauth.js';
import { 
  createFleetCarrierEmbed, 
  createCommanderEmbed, 
  createMarketEmbed, 
  createShipyardEmbed, 
  createCommunityGoalsEmbed, 
  createShipsEmbed, 
  createSquadronEmbed, 
  createStarportEmbed, 
  createLastSystemEmbed, 
  createSuitEmbed 
} from './utils/embeds.js';
import express from 'express';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['CHANNEL', 'DM_USER'],
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8087;

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

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await initializeCommands(client);
});

client.on('interactionCreate', async (interaction) => {

  console.log(interaction.commandName);

  if (interaction.isCommand()) {
    const { commandName } = interaction;
    const command = client.commands.get(commandName);

    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Command execution error:', error);
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription(`An error occurred: ${error.message}`);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;
    const discordUserId = interaction.user.id;

    if (customId === 'select_default_account') {
      const { handleSelectDefault } = await import('./commands/_public/accounts.js');
      await handleSelectDefault(interaction, interaction.values[0]);
      return;
    }

    if (customId === 'profile_select_account') {
      const accountId = parseInt(interaction.values[0]);
      await interaction.deferUpdate();
      
      try {
        const profile = await getCommanderProfile(discordUserId, accountId);
        
        if (!profile || !profile.commander) {
          const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Error')
            .setDescription('Unable to fetch commander profile.');
          await interaction.editReply({ embeds: [embed], components: [] });
          return;
        }

        const commanderEmbed = createCommanderEmbed(profile.commander);
        await interaction.editReply({ embeds: [commanderEmbed] });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('Error')
          .setDescription(`Error: ${error.message}`);
        await interaction.editReply({ embeds: [embed], components: [] });
      }
      return;
    }

    if (customId === 'carrier_select_account') {
      const accountId = parseInt(interaction.values[0]);
      await interaction.deferUpdate();
      
      try {
        const fc = await getFleetCarrier(discordUserId, accountId);
        
        if (!fc) {
          const embed = new EmbedBuilder()
            .setColor(0xef4444)
            .setTitle('Error')
            .setDescription('Unable to fetch fleet carrier data.');
          await interaction.editReply({ embeds: [embed], components: [] });
          return;
        }

        const fcEmbed = createFleetCarrierEmbed(fc);
        await interaction.editReply({ embeds: [fcEmbed] });
      } catch (error) {
        const embed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle('Error')
          .setDescription(`Error: ${error.message}`);
        await interaction.editReply({ embeds: [embed], components: [] });
      }
      return;
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    const discordUserId = interaction.user.id;

    const actionHandlers = {
      'action_carrier': async () => {
        await interaction.deferReply();
        const fc = await getFleetCarrier(discordUserId);
        if (!fc) return interaction.editReply({ content: 'Unable to fetch fleet carrier data.' });
        return interaction.editReply({ embeds: [createFleetCarrierEmbed(fc)] });
      },
      'action_market': async () => {
        await interaction.deferReply();
        const market = await getMarket(discordUserId);
        if (!market) return interaction.editReply({ content: 'Unable to fetch market data.' });
        return interaction.editReply({ embeds: [createMarketEmbed(market)] });
      },
      'action_shipyard': async () => {
        await interaction.deferReply();
        const shipyard = await getShipyard(discordUserId);
        if (!shipyard) return interaction.editReply({ content: 'Unable to fetch shipyard data.' });
        return interaction.editReply({ embeds: [createShipyardEmbed(shipyard)] });
      },
      'action_ships': async () => {
        await interaction.deferReply();
        const profile = await getCommanderProfile(discordUserId);
        if (!profile || !profile.commander) return interaction.editReply({ content: 'Unable to fetch ships data.' });
        return interaction.editReply({ embeds: [createShipsEmbed(profile)] });
      },
      'action_squadron': async () => {
        await interaction.deferReply();
        const profile = await getCommanderProfile(discordUserId);
        if (!profile || !profile.commander) return interaction.editReply({ content: 'Unable to fetch squadron data.' });
        return interaction.editReply({ embeds: [createSquadronEmbed(profile)] });
      },
      'action_laststarport': async () => {
        await interaction.deferReply();
        const profile = await getCommanderProfile(discordUserId);
        if (!profile || !profile.commander) return interaction.editReply({ content: 'Unable to fetch starport data.' });
        return interaction.editReply({ embeds: [createStarportEmbed(profile)] });
      },
      'action_lastsystem': async () => {
        await interaction.deferReply();
        const profile = await getCommanderProfile(discordUserId);
        if (!profile || !profile.commander) return interaction.editReply({ content: 'Unable to fetch system data.' });
        return interaction.editReply({ embeds: [createLastSystemEmbed(profile)] });
      },
      'action_suit': async () => {
        await interaction.deferReply();
        const profile = await getCommanderProfile(discordUserId);
        if (!profile || !profile.commander) return interaction.editReply({ content: 'Unable to fetch suit data.' });
        return interaction.editReply({ embeds: [createSuitEmbed(profile)] });
      },
      'action_communitygoals': async () => {
        await interaction.deferReply();
        const goals = await getCommunityGoals(discordUserId);
        if (!goals) return interaction.editReply({ content: 'Unable to fetch community goals.' });
        return interaction.editReply({ embeds: [createCommunityGoalsEmbed(goals)] });
      },
      'action_journal': async () => {
        await interaction.deferReply();
        const journal = await getJournal(discordUserId);
        if (!journal) return interaction.editReply({ content: 'Unable to fetch journal data.' });
        const count = Array.isArray(journal) ? journal.length : 0;
        return interaction.editReply({ content: `Journal fetched. ${count} event(s) found.` });
      },
      'link_account': async () => {
        const { createOAuthSession } = await import('./services/oauth.js');
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
        const { sessionId, authUrl } = await createOAuthSession(discordUserId);
        
        const embed = new EmbedBuilder()
          .setColor(0x3b82f6)
          .setTitle('Link Frontier Account')
          .setDescription('Click the button below to link another Frontier account:');

        const button = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Link Frontier Account')
              .setStyle(ButtonStyle.Link)
              .setURL(authUrl)
          );

        await interaction.update({ embeds: [embed], components: [button] });
      },
    };

    const handler = actionHandlers[customId];
    if (handler) {
      try {
        await handler();
      } catch (error) {
        console.error('Button handler error:', error);
        if (interaction.deferred) {
          await interaction.editReply({ content: `Error: ${error.message}`, components: [] });
        } else {
          await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
        }
      }
    }
  }
});

client.commands = new Map();

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

client.login(process.env.DISCORD_TOKEN);
