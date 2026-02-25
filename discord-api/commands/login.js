import { InteractionResponseFlags } from "discord-interactions";
import { createCommand } from "../utils/createCommand.js";

export const data = createCommand('login', 'Link your Frontier account with Discord');

export async function execute(interaction) {

    const id = interaction.user.id;

    return interaction.reply({ content: 'Response: ' + id, flags: InteractionResponseFlags.EPHEMERAL });

}