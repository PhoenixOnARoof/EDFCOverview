import { createCommand } from '../_base.js';
import { isLoggedIn, revokeOAuthToken } from '../../services/oauth.js';
import { EmbedBuilder } from 'discord.js';

export const data = createCommand('logout', 'Unlink your Frontier account from Discord');

export async function execute(interaction) {
  const discordUserId = interaction.user.id;

  const userLoggedIn = await isLoggedIn(discordUserId);

  if (!userLoggedIn) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Not Logged In')
      .setDescription('You are not linked to a Frontier account.');

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  await revokeOAuthToken(discordUserId);

  const embed = new EmbedBuilder()
    .setColor(0x22c55e)
    .setTitle('Logged Out')
    .setDescription('Your Frontier account has been unlinked successfully.');

  return interaction.reply({ embeds: [embed], ephemeral: true });
}
