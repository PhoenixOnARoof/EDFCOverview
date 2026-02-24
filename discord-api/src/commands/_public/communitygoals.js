import { createCommand } from '../_base.js';
import { getCommunityGoals, isLoggedIn } from '../../services/oauth.js';
import { createCommunityGoalsEmbed } from '../../utils/embeds.js';
import { EmbedBuilder } from 'discord.js';

export const data = createCommand('communitygoals', 'View current community goals');

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
    const goals = await getCommunityGoals(discordUserId);

    if (!goals) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('Unable to fetch community goals. Please try again.');

      return interaction.editReply({ embeds: [embed] });
    }

    const goalsEmbed = createCommunityGoalsEmbed(goals);

    return interaction.editReply({ embeds: [goalsEmbed] });
  } catch (error) {
    console.error('Community goals error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching community goals: ${error.message}`);

    return interaction.editReply({ embeds: [embed] });
  }
}
