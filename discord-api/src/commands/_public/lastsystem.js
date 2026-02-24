import { createCommand } from '../_base.js';
import { getCommanderProfile, isLoggedIn } from '../../services/oauth.js';
import { createLastSystemEmbed } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = createCommand('lastsystem', 'View last system information');

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
        .setDescription('Unable to fetch system data. Please try again.');

      return interaction.editReply({ embeds: [embed] });
    }

    const systemEmbed = createLastSystemEmbed(profile);

    return interaction.editReply({ embeds: [systemEmbed] });
  } catch (error) {
    console.error('Last system error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching system: ${error.message}`);

    return interaction.editReply({ embeds: [embed] });
  }
}
