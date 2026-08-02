import { config } from '../config.js';
import { isQueueOpen, getQueueList, getCurrentTest, getAllActiveTesters } from '../services/queue.js';
import { createQueueEmbed, createRequestEmbed } from '../utils/embeds.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export async function onReady(client) {
  console.log('Bot logado como ' + client.user.tag);

  setupRequestChannel(client);
  setupFilaChannel(client);
}

async function setupRequestChannel(client) {
  const requestChannel = client.channels.cache.get(config.requestChannelId);
  if (!requestChannel) {
    console.log('Canal de request nao encontrado');
    return;
  }

  const messages = await requestChannel.messages.fetch({ limit: 10 });
  const existingMessage = messages.find(m => m.author.id === client.user.id);

  const embed = createRequestEmbed();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('register_access')
      .setLabel('Registrar')
      .setStyle(ButtonStyle.Success)
  );

  if (existingMessage) {
    await existingMessage.edit({ embeds: [embed], components: [row] });
  } else {
    await requestChannel.send({ embeds: [embed], components: [row] });
  }
}

async function setupFilaChannel(client) {
  const filaChannel = client.channels.cache.get(config.filaChannelId);
  if (!filaChannel) {
    console.log('Canal de fila nao encontrado');
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.guildId);

    await filaChannel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: false
    });

    if (config.testerRoleId) {
      await filaChannel.permissionOverwrites.edit(config.testerRoleId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true
      });
    }

    if (config.waitlistRoleId) {
      await filaChannel.permissionOverwrites.edit(config.waitlistRoleId, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true
      });
    }
  } catch (err) {
    console.error('Erro ao configurar permissoes:', err);
  }

  const queueList = getQueueList();
  const currentTest = getCurrentTest();
  const isOpen = isQueueOpen();
  const activeTesters = getAllActiveTesters().map(t => t.tester_id);

  const embed = createQueueEmbed(queueList, currentTest, isOpen, activeTesters);
  const roleMention = '@here';

  const messages = await filaChannel.messages.fetch({ limit: 10 });
  const existingMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

  if (isOpen) {
    const enterRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('enter_queue')
        .setLabel('Entrar na Fila')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('leave_queue')
        .setLabel('Sair da Fila')
        .setStyle(ButtonStyle.Danger)
    );

    if (existingMessage) {
      await existingMessage.edit({ content: roleMention, embeds: [embed], components: [enterRow] });
    } else {
      await filaChannel.send({ content: roleMention, embeds: [embed], components: [enterRow] });
    }
  } else {
    if (existingMessage) {
      await existingMessage.edit({ embeds: [embed], components: [] });
    } else {
      await filaChannel.send({ embeds: [embed] });
    }
  }
}
