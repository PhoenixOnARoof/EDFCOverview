import { createCommand } from '../_base.js';
import { getCommanderProfile, isLoggedIn } from '../../services/oauth.js';
import { createShipsEmbed } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = createCommand('ships', 'View all your owned ships');

export async function execute(interaction) {
  const discordUserId = interaction.user.id;

  const userLoggedIn = await isLoggedIn(discordUserId);

  if (!userLoggedIn) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Not Logged In')
      .setDescription('You need to login first! Use `/login` to link your Frontier account.');

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  await interaction.deferReply();

  try {
    const profile = await getCommanderProfile(discordUserId);

    if (!profile || !profile.commander) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('Unable to fetch ships data. Please try again.');

      return interaction.editReply({ embeds: [embed] });
    }

    const shipsEmbed = createShipsEmbed(profile);

    return interaction.editReply({ embeds: [shipsEmbed] });
  } catch (error) {
    console.error('Ships error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching ships: ${error.message}`);

    return interaction.editReply({ embeds: [embed] });
  }
}
