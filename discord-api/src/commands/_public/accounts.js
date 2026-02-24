import { createCommand } from '../_base.js';
import { isLoggedIn, getUserAccounts, setDefaultAccount, removeAccount, getDefaultAccountId, createOAuthSession } from '../../services/oauth.js';
import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const data = createCommand('accounts', 'View and manage linked Frontier accounts');

export async function execute(interaction) {
  const discordUserId = interaction.user.id;

  const userLoggedIn = await isLoggedIn(discordUserId);

  if (!userLoggedIn) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('No Linked Accounts')
      .setDescription('You have no Frontier account linked. Use `/login` to link one.');

    const loginButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('Link Account')
          .setStyle(ButtonStyle.Primary)
          .setCustomId('link_account')
      );

    return interaction.reply({ embeds: [embed], components: [loginButton], ephemeral: true });
  }

  const accounts = await getUserAccounts(discordUserId);
  const defaultAccountId = await getDefaultAccountId(discordUserId);

  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle('Linked Frontier Accounts')
    .setDescription(`You have ${accounts.length} account(s) linked`);

  const accountList = accounts.map((account) => {
    const isDefault = account.id === defaultAccountId;
    const label = account.cmdrName || account.frontierCustomerId || `Account ${account.id}`;
    return {
      label: label.length > 100 ? label.substring(0, 97) + '...' : label,
      value: account.id.toString(),
      description: isDefault ? 'Currently default' : (account.frontierCustomerId ? `ID: ${account.frontierCustomerId}` : null),
      default: isDefault,
    };
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_default_account')
    .setPlaceholder('Select default account')
    .addOptions(accountList);

  const selectRow = new ActionRowBuilder()
    .addComponents(selectMenu);

  const addButton = new ButtonBuilder()
    .setLabel('Add Account')
    .setStyle(ButtonStyle.Success)
    .setCustomId('add_account');

  const removeButton = new ButtonBuilder()
    .setLabel('Remove Selected')
    .setStyle(ButtonStyle.Danger)
    .setCustomId('remove_account');

  const buttonRow = new ActionRowBuilder()
    .addComponents(addButton, removeButton);

  return interaction.reply({ 
    embeds: [embed], 
    components: [selectRow, buttonRow], 
    ephemeral: true 
  });
}

export async function handleSelectDefault(interaction, accountId) {
  const discordUserId = interaction.user.id;
  
  try {
    await setDefaultAccount(discordUserId, parseInt(accountId));
    
    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('Default Account Updated')
      .setDescription('Your default account has been changed.');
    
    await interaction.update({ embeds: [embed], components: [] });
  } catch (error) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(error.message);
    
    await interaction.update({ embeds: [embed], components: [] });
  }
}

export async function handleAddAccount(interaction) {
  const discordUserId = interaction.user.id;
  
  const { sessionId, authUrl } = await createOAuthSession(discordUserId);

  const embed = new EmbedBuilder()
    .setColor(0x3b82f6)
    .setTitle('Link Another Account')
    .setDescription('Click the button below to link another Frontier account:');

  const button = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Link Frontier Account')
        .setStyle(ButtonStyle.Link)
        .setURL(authUrl)
    );

  await interaction.update({ embeds: [embed], components: [button] });
}

export async function handleRemoveAccount(interaction, accountId) {
  const discordUserId = interaction.user.id;
  
  try {
    await removeAccount(discordUserId, parseInt(accountId));
    
    const accounts = await getUserAccounts(discordUserId);
    const defaultAccountId = await getDefaultAccountId(discordUserId);

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('Account Removed')
      .setDescription(`You now have ${accounts.length} account(s) linked.`);

    if (accounts.length > 0) {
      const accountList = accounts.map((account) => {
        const isDefault = account.id === defaultAccountId;
        const label = account.cmdrName || account.frontierCustomerId || `Account ${account.id}`;
        return {
          label: label.length > 100 ? label.substring(0, 97) + '...' : label,
          value: account.id.toString(),
          description: isDefault ? 'Currently default' : (account.frontierCustomerId ? `ID: ${account.frontierCustomerId}` : null),
          default: isDefault,
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_default_account')
        .setPlaceholder('Select default account')
        .addOptions(accountList);

      const selectRow = new ActionRowBuilder()
        .addComponents(selectMenu);

      const addButton = new ButtonBuilder()
        .setLabel('Add Account')
        .setStyle(ButtonStyle.Success)
        .setCustomId('add_account');

      const removeButton = new ButtonBuilder()
        .setLabel('Remove Selected')
        .setStyle(ButtonStyle.Danger)
        .setCustomId('remove_account');

      const buttonRow = new ActionRowBuilder()
        .addComponents(addButton, removeButton);

      await interaction.update({ embeds: [embed], components: [selectRow, buttonRow] });
    } else {
      const loginButton = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Link Account')
            .setStyle(ButtonStyle.Primary)
            .setCustomId('link_account')
        );

      await interaction.update({ embeds: [embed], components: [loginButton] });
    }
  } catch (error) {
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle('Error')
      .setDescription(error.message);
    
    await interaction.update({ embeds: [embed], components: [] });
  }
}
