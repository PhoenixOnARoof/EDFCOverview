import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initializeCommands(client) {
  const commands = [];

  const commandsPath = join(__dirname, '_public');
  
  if (!readdirSync(commandsPath)) {
    console.error('No commands directory found');
    return commands;
  }

  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(filePath);
    
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commands.push(command.data);
      console.log(`Loaded command: ${command.data.name}`);
    } else {
      console.warn(`Invalid command at ${filePath}`);
    }
  }
  
  try {
    await client.application.commands.set(commands);
    console.log(`Registered ${commands.length} global commands`);
  } catch (error) {
    console.error('Failed to register global commands:', error);
  }

  return commands;
}
