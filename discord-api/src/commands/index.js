import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function initializeCommands(client) {
  const commands = [];

  const commandsPath = join(__dirname, 'commands');
  const commandFolders = readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    
    if (!folder.startsWith('_')) {
      const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const command = await import(filePath);
        
        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data);
          console.log(`Loaded command: ${command.data.name} (${folder})`);
        } else {
          console.warn(`Invalid command at ${filePath}`);
        }
      }
    }
  }

  const guildCommandsPath = join(__dirname, '..', 'commands');
  
  try {
    await client.application.commands.set(commands);
    console.log(`Registered ${commands.length} global commands`);
  } catch (error) {
    console.error('Failed to register global commands:', error);
  }

  return commands;
}
