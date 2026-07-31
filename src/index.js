import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './config.js';
import { initDatabase } from './services/database.js';
import { filaCommand } from './commands/fila.js';
import { onReady } from './events/ready.js';
import { onInteraction } from './events/interactionCreate.js';
import { createServer } from 'http';

async function main() {
  createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot online');
  }).listen(process.env.PORT || 3000);

  await initDatabase();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates
    ]
  });

  client.commands = new Collection();
  client.commands.set(filaCommand.data.name, filaCommand);

  client.once('ready', () => onReady(client));
  client.on('interactionCreate', (interaction) => onInteraction(interaction, client));

  await client.login(config.token);
}

main().catch(console.error);
