import 'dotenv/config';

import { Client, GatewayIntentBits } from "discord.js";
import { initializeCommands } from './utils/initializeCommands.js';

export const client = new Client({
    intents: [
        // GatewayIntentBits.MessageContent,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Map();

client.on('ready', async () => {
    console.log(`${client.user.tag} ready to fly`);
    await initializeCommands(client);
});

client.on('interactionCreate', async (interaction) => {

    console.log(interaction.commandName, interaction.commandType);

});

client.login(process.env.DISCORD_TOKEN);