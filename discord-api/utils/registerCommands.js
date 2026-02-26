import 'dotenv/config';
import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getCommands() {

    const commands = [];
    const commandsPath = join(__dirname, '..', 'commands');


    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {

        const filePath = join(commandsPath, file);
        const command = await import(filePath);

        if ('data' in command) {
            commands.push(command.data)
        } else
            console.log(`${filePath} was invalid`);

    }

    return commands;

}

async function registerCommands() {

    const commands = await getCommands();

    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    await rest.put(
        Routes.applicationCommands(process.env.APP_ID),
        { body: commands }
    );

    console.log('Registered Commands');

}

registerCommands();