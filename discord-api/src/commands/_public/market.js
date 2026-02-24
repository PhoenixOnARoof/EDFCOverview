import { createCommand } from '../_base.js';
import { getMarket, isLoggedIn } from '../../services/oauth.js';
import { createMarketEmbed } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = createCommand('market', 'View market data from last docked station');

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
    const market = await getMarket(discordUserId);

    if (!market) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('Unable to fetch market data. Please try again.');

      return interaction.editReply({ embeds: [embed] });
    }

    const marketEmbed = createMarketEmbed(market);

    return interaction.editReply({ embeds: [marketEmbed] });
  } catch (error) {
    console.error('Market error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching market: ${error.message}`);

    return interaction.editReply({ embeds: [embed] });
  }
}
