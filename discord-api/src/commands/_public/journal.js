import { createCommand } from '../_base.js';
import { getJournal, isLoggedIn } from '../../services/oauth.js';
import { EmbedBuilder } from 'discord.js';

export const data = createCommand('journal', 'View journal data');

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
    const journal = await getJournal(discordUserId);

    if (!journal) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('Unable to fetch journal data. Please try again.');

      return interaction.editReply({ embeds: [embed] });
    }

    const eventCount = Array.isArray(journal) ? journal.length : 0;

    const embed = new EmbedBuilder()
      .setColor(0x3b82f6)
      .setTitle('Journal')
      .setDescription(`Journal fetched successfully. ${eventCount} event(s) found.`);

    return interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Journal error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching journal: ${error.message}`);

    return interaction.editReply({ embeds: [embed] });
  }
}
