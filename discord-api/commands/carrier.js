import { EmbedBuilder } from "discord.js";
import { createCommand } from "../utils/createCommand";
import { shareButton } from "../utils/share";

export const data = createCommand('carrier', 'View your fleet carrier information');

export async function execute(interaction) {

    const embed = new EmbedBuilder().setTitle('Embed Test').setDescription('Description');

    return interaction.reply({
        embeds: [embed],
        components: [shareButton('carrier')]
    });

}