import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { filaCommand } from './commands/fila.js';

const commands = [filaCommand.data.toJSON()];

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    console.log('🔄 Registrando comandos slash...');

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log('✅ Comandos registrados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error);
  }
})();
