import 'dotenv/config';

import { Client, EmbedBuilder, GatewayIntentBits } from "discord.js";
import { initializeCommands } from './utils/initializeCommands.js';
import { InteractionResponseFlags } from 'discord-interactions';

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

    if (interaction.isCommand()) {

        const { commandName } = interaction;
        const command = client.commands.get(commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error('Command Error', error);

            const embed = new EmbedBuilder()
                .setColor(0xef4444)
                .setTitle('Error')
                .setDescription('An error occurred: ' + error.message);

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });
            } else
                await interaction.reply({ embeds: [embed], flags: InteractionResponseFlags.EPHEMERAL });

        }

    }

});

client.login(process.env.DISCORD_TOKEN);