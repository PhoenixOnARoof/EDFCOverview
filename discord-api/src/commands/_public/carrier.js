import { createCommand } from '../_base.js';
import { getFleetCarrier, isLoggedIn, hasMultipleAccounts, getUserAccounts, getDefaultAccountId } from '../../services/oauth.js';
import { createFleetCarrierEmbed } from '../../utils/embeds.js';
import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const data = createCommand('carrier', 'View your fleet carrier information');

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

  const hasMultiple = await hasMultipleAccounts(discordUserId);
  let components = [];

  if (hasMultiple) {
    const accounts = await getUserAccounts(discordUserId);
    const defaultAccountId = await getDefaultAccountId(discordUserId);

    const accountOptions = accounts.map((account) => {
      let label = account.cmdrName || `Account ${account.id}`;
      if (account.carrierName) {
        label += ` (${account.carrierName})`;
      } else if (account.carrierId) {
        label += ` (${account.carrierId})`;
      }
      return {
        label: label.length > 100 ? label.substring(0, 97) + '...' : label,
        value: account.id.toString(),
        description: account.id === defaultAccountId ? 'Default' : (account.frontierCustomerId ? `ID: ${account.frontierCustomerId}` : null),
        default: account.id === defaultAccountId,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('carrier_select_account')
      .setPlaceholder('Select account')
      .addOptions(accountOptions);

    const selectRow = new ActionRowBuilder()
      .addComponents(selectMenu);

    components.push(selectRow);
  }

  try {
    const fc = await getFleetCarrier(discordUserId);

    if (!fc) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('Unable to fetch fleet carrier data. Please try again.');

      return interaction.editReply({ embeds: [embed], components: [] });
    }

    const fcEmbed = createFleetCarrierEmbed(fc);

    return interaction.editReply({ embeds: [fcEmbed], components });
  } catch (error) {
    console.error('Fleet carrier error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching fleet carrier: ${error.message}`);

    return interaction.editReply({ embeds: [embed], components: [] });
  }
}
