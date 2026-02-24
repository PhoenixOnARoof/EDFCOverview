import { createCommand } from '../_base.js';
import { getShipyard, isLoggedIn } from '../../services/oauth.js';
import { createShipyardEmbed } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = createCommand('shipyard', 'View shipyard and outfitting data');

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
    const shipyard = await getShipyard(discordUserId);

    if (!shipyard) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('Unable to fetch shipyard data. Please try again.');

      return interaction.editReply({ embeds: [embed] });
    }

    const shipyardEmbed = createShipyardEmbed(shipyard);

    return interaction.editReply({ embeds: [shipyardEmbed] });
  } catch (error) {
    console.error('Shipyard error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching shipyard: ${error.message}`);

    return interaction.editReply({ embeds: [embed] });
  }
}
