import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function shareButton(command) {
    return new ActionRowBuilder().addComponents(new ButtonBuilder()
        .setLabel('Share')
        .setStyle(ButtonStyle.Primary)
        .setCustomId(command + '_share')
    );
}

export function shareButtonEvent(interaction) { 
    return interaction;
}