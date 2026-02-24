import { SlashCommandBuilder, InteractionContextType } from 'discord.js';

export const createCommand = (name, description, options = {}) => {
  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setIntegrationTypes(0, 1)
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    );

  if (options.options) {
    for (const opt of options.options) {
      builder.addStringOption(opt.builder || opt);
    }
  }

  return builder;
};

export const createUserCommand = (name, description, options = {}) => {
  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setIntegrationTypes(0)
    .setContexts(
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    );

  if (options.options) {
    for (const opt of options.options) {
      builder.addStringOption(opt.builder || opt);
    }
  }

  return builder;
};

export const createGuildCommand = (name, description, options = {}) => {
  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setIntegrationTypes(1)
    .setContexts(InteractionContextType.Guild);

  if (options.options) {
    for (const opt of options.options) {
      builder.addStringOption(opt.builder || opt);
    }
  }

  return builder;
};
