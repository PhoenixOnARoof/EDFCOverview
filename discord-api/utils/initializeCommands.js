import { readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initializeCommands(client) {

    const commandsPath = join(__dirname, '../commands');

    if (!readdirSync(commandsPath)) {
        console.error('No Commands in the Wing, Major');
        return false;
    }

    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {

        const filePath = join(commandsPath, file);
        const command = await import(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log('Loaded:', command.data.name);
        } else
            console.log(`${filePath} was invalid`);

    }

    return true;

}