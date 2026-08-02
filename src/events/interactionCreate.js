import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { isQueueOpen, addToQueue, removeFromQueue, getQueueList, getCurrentTest, getAllActiveTesters } from '../services/queue.js';
import { config } from '../config.js';

const registeredUsers = new Map();

export async function onInteraction(interaction, client) {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'Erro ao executar comando!' }).catch(() => {});
      } else {
        await interaction.reply({ content: 'Erro ao executar comando!', ephemeral: true }).catch(() => {});
      }
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'register_access') {
      await handleShowRegisterModal(interaction);
    } else if (interaction.customId === 'enter_queue') {
      await handleEnterQueue(interaction);
    } else if (interaction.customId === 'leave_queue') {
      await handleLeaveQueue(interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'register_modal') {
      await handleRegisterModalSubmit(interaction);
    }
  }
}

async function handleShowRegisterModal(interaction) {
  const userId = interaction.user.id;

  if (registeredUsers.has(userId)) {
    return interaction.reply({
      content: 'Voce ja esta registrado! Va ate o canal <#' + config.filaChannelId + '> para entrar na fila.',
      ephemeral: true
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('register_modal')
    .setTitle('Registro para Teste');

  const regionInput = new TextInputBuilder()
    .setCustomId('region_input')
    .setLabel('Servidor')
    .setPlaceholder('Ex: SA East, SA West, NA East, NA West, EU')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const nickInput = new TextInputBuilder()
    .setCustomId('nick_input')
    .setLabel('Nick do Minecraft')
    .setPlaceholder('Seu nome de usuario no Minecraft')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const firstRow = new ActionRowBuilder().addComponents(regionInput);
  const secondRow = new ActionRowBuilder().addComponents(nickInput);

  modal.addComponents(firstRow, secondRow);

  await interaction.showModal(modal);
}

async function handleRegisterModalSubmit(interaction) {
  const userId = interaction.user.id;
  const region = interaction.fields.getTextInputValue('region_input');
  const nick = interaction.fields.getTextInputValue('nick_input');

  registeredUsers.set(userId, { region, nick, registeredAt: new Date() });

  try {
    const guild = await interaction.client.guilds.fetch(config.guildId);
    const member = await guild.members.fetch(userId);
    const filaChannel = await guild.channels.fetch(config.filaChannelId);

    if (filaChannel) {
      await filaChannel.permissionOverwrites.edit(member, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true
      });
    }

    if (config.waitlistRoleId) {
      try {
        await member.roles.add(config.waitlistRoleId);
      } catch (err) {
        console.error('Erro ao dar cargo waitlist:', err.message);
      }
    }

    await interaction.reply({
      content: 'Registro completo! Servidor: ' + region + ' | Nick: ' + nick + '\nVoce tem acesso ao canal <#' + config.filaChannelId + '>. Va ate la para entrar na fila.',
      ephemeral: true
    });
  } catch (err) {
    console.error('Erro ao dar acesso:', err);
    await interaction.reply({
      content: 'Erro ao dar acesso ao canal. Contate um admin.',
      ephemeral: true
    });
  }
}

async function handleEnterQueue(interaction) {
  if (!isQueueOpen()) {
    return interaction.reply({
      content: 'A fila esta fechada no momento. Aguarde um tester abrir!',
      ephemeral: true
    });
  }

  const userData = registeredUsers.get(interaction.user.id);
  const region = userData ? userData.region : 'SA';
  const nick = userData ? userData.nick : interaction.user.username;

  const result = addToQueue(interaction.user.id, nick, region);

  if (result.error) {
    return interaction.reply({ content: result.error, ephemeral: true });
  }

  await interaction.reply({
    content: 'Voce entrou na fila! Posicao: ' + result.position + ' | Servidor: ' + region + ' | Nick: ' + nick,
    ephemeral: true
  });

  updateFilaEmbed(interaction.client);
}

async function handleLeaveQueue(interaction) {
  removeFromQueue(interaction.user.id);

  await interaction.reply({
    content: 'Voce saiu da fila!',
    ephemeral: true
  });

  updateFilaEmbed(interaction.client);
}

async function updateFilaEmbed(client) {
  const filaChannel = client.channels.cache.get(config.filaChannelId);
  if (!filaChannel) return;

  const { createQueueEmbed } = await import('../utils/embeds.js');

  const queueList = getQueueList();
  const currentTest = getCurrentTest();
  const isOpen = isQueueOpen();
  const activeTesters = getAllActiveTesters().map(t => t.tester_id);

  const embed = createQueueEmbed(queueList, currentTest, isOpen, activeTesters);
  const roleMention = '@here';

  const messages = await filaChannel.messages.fetch({ limit: 10 });
  const botMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

  if (isOpen) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('enter_queue')
        .setLabel('Entrar na Fila')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('leave_queue')
        .setLabel('Sair da Fila')
        .setStyle(ButtonStyle.Danger)
    );

    if (botMessage) {
      await botMessage.edit({ content: roleMention, embeds: [embed], components: [row] });
    } else {
      await filaChannel.send({ content: roleMention, embeds: [embed], components: [row] });
    }
  } else {
    if (botMessage) {
      await botMessage.edit({ embeds: [embed], components: [] });
    } else {
      await filaChannel.send({ embeds: [embed] });
    }
  }
}
