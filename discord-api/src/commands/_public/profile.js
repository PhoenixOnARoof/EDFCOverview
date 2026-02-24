import { createCommand } from '../_base.js';
import { getCommanderProfile, isLoggedIn, hasMultipleAccounts, getUserAccounts, getDefaultAccountId } from '../../services/oauth.js';
import { createCommanderEmbed } from '../../utils/embeds.js';
import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const data = createCommand('profile', 'View your commander profile');

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

    const accountOptions = accounts.map((account, index) => {
      const label = account.frontierCustomerId 
        ? `Account ${index + 1} (${account.frontierCustomerId})`
        : `Account ${index + 1}`;
      return {
        label: label.length > 100 ? label.substring(0, 97) + '...' : label,
        value: account.id.toString(),
        description: account.id === defaultAccountId ? 'Default' : null,
        default: account.id === defaultAccountId,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('profile_select_account')
      .setPlaceholder('Select account')
      .addOptions(accountOptions);

    const selectRow = new ActionRowBuilder()
      .addComponents(selectMenu);

    components.push(selectRow);
  }

  const buttons = [
    { label: 'Carrier', customId: 'action_carrier', style: ButtonStyle.Primary },
    { label: 'Market', customId: 'action_market', style: ButtonStyle.Primary },
    { label: 'Shipyard', customId: 'action_shipyard', style: ButtonStyle.Primary },
    { label: 'Ships', customId: 'action_ships', style: ButtonStyle.Primary },
    { label: 'Squadron', customId: 'action_squadron', style: ButtonStyle.Primary },
    { label: 'Starport', customId: 'action_laststarport', style: ButtonStyle.Secondary },
    { label: 'System', customId: 'action_lastsystem', style: ButtonStyle.Secondary },
    { label: 'Suit', customId: 'action_suit', style: ButtonStyle.Secondary },
    { label: 'Goals', customId: 'action_communitygoals', style: ButtonStyle.Success },
    { label: 'Journal', customId: 'action_journal', style: ButtonStyle.Success },
  ];

  const buttonRows = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder();
    buttons.slice(i, i + 5).forEach(btn => {
      row.addComponents(
        new ButtonBuilder()
          .setLabel(btn.label)
          .setStyle(btn.style)
          .setCustomId(btn.customId)
      );
    });
    buttonRows.push(row);
  }

  components.push(...buttonRows);

  try {
    const profile = await getCommanderProfile(discordUserId);

    if (!profile || !profile.commander) {
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('Error')
        .setDescription('Unable to fetch commander profile. Please try again.');

      return interaction.editReply({ embeds: [embed], components: [] });
    }

    const commanderEmbed = createCommanderEmbed(profile.commander);

    return interaction.editReply({ embeds: [commanderEmbed], components });
  } catch (error) {
    console.error('Profile error:', error);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(`Error fetching profile: ${error.message}`);

    return interaction.editReply({ embeds: [embed], components: [] });
  }
}
