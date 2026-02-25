import { createCommand } from "../utils/createCommand";

export const data = createCommand('login', 'Link your Frontier account with Discord');

export async function execute(interaction) {

    const id = interaction.user.id;

    return interaction.reply('Response: ' + id);

}