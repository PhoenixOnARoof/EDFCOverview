import { InteractionContextType, SlashCommandBuilder } from "discord.js"

export const createCommand = (name, description, options = {}) => {

    const builder = new SlashCommandBuilder()
        .setName(name)
        .setDescription(description)
        .setContexts(
            InteractionContextType.Guild,
            InteractionContextType.BotDM,
            InteractionContextType.PrivateChannel
        );

    return builder;

}