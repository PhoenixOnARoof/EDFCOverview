import { createCommand } from '../_base.js';
import { isLoggedIn, createOAuthSession } from '../../services/oauth.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const data = createCommand('login', 'Link your Frontier account with Discord');

export async function execute(interaction) {
  const discordUserId = interaction.user.id;
  
  const userLoggedIn = await isLoggedIn(discordUserId);

  if (userLoggedIn) {
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('Already Logged In')
      .setDescription('You are already linked to a Frontier account!');

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  const { sessionId, authUrl } = await createOAuthSession(discordUserId);

  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle('Link Frontier Account')
    .setDescription('Click the button below to link your Frontier account:');

  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Link Frontier Account')
        .setStyle(ButtonStyle.Link)
        .setURL(authUrl)
    );

  return interaction.reply({ embeds: [embed], components: [button], ephemeral: true });
}
