import 'dotenv/config';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { REST, Routes } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const isGuild = args.includes('--guild');
const isUser = args.includes('--user');

async function getCommands() {
  const commands = [];
  const commandsPath = join(__dirname, '..', 'commands');
  
  const publicPath = join(commandsPath, '_public');
  if (readdirSync(publicPath).length > 0) {
    const commandFiles = readdirSync(publicPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = join(publicPath, file);
      const command = await import(filePath);
      
      if ('data' in command) {
        commands.push(command.data);
      }
    }
  }

  return commands;
}

async function registerCommands() {
  const commands = await getCommands();
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  console.log(`Registering ${commands.length} commands...`);

  try {
    if (isGuild) {
      if (!process.env.GUILD_ID) {
        console.error('GUILD_ID environment variable is required for guild registration');
        process.exit(1);
      }
      await rest.put(
        Routes.applicationGuildCommands(process.env.APP_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`Registered commands to guild ${process.env.GUILD_ID}`);
    } else if (isUser) {
      console.log('User commands are automatically available. Skipping registration.');
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.APP_ID),
        { body: commands }
      );
      console.log('Registered global commands');
    }
  } catch (error) {
    console.error('Registration failed:', error);
    process.exit(1);
  }
}

registerCommands();
