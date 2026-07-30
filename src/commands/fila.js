import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';
import {
  isQueueOpen,
  setQueueOpen,
  addToQueue,
  getNext,
  getCurrentTest,
  finishTest,
  skipTest,
  getQueueList,
  forcePosition,
  addActiveTester,
  removeActiveTester,
  getAllActiveTesters,
  setLastTested,
  removeCooldown
} from '../services/queue.js';
import { createQueueEmbed, createResultEmbed } from '../utils/embeds.js';

export const filaCommand = {
  data: new SlashCommandBuilder()
    .setName('fila')
    .setDescription('Gerenciar fila de testes')
    .addSubcommand(sub =>
      sub.setName('abrir').setDescription('Abre a fila para testes')
    )
    .addSubcommand(sub =>
      sub.setName('fechar').setDescription('Fecha a fila')
    )
    .addSubcommand(sub =>
      sub.setName('finalizar')
        .setDescription('Finaliza teste e atribui tier')
        .addStringOption(opt =>
          opt.setName('tier')
            .setDescription('Tier do jogador (HT1-5, LT1-5)')
            .setRequired(true)
            .addChoices(
              ...config.tiers.map(t => ({ name: t, value: t }))
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('proximo').setDescription('Puxa proximo da fila')
    )
    .addSubcommand(sub =>
      sub.setName('skipar').setDescription('Fecha ticket de teste atual')
    )
    .addSubcommand(sub =>
      sub.setName('force')
        .setDescription('Forca posicao na fila')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario para forcar posicao')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('posicao')
            .setDescription('Nova posicao')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('rmcooldown')
        .setDescription('Remove o cooldown de um jogador')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('Usuario para remover cooldown')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== 'abrir' && subcommand !== 'fechar') {
      if (!isQueueOpen()) {
        return interaction.reply({ content: 'A fila esta fechada!', ephemeral: true });
      }
    }

    switch (subcommand) {
      case 'abrir':
        return handleAbrir(interaction, client);
      case 'fechar':
        return handleFechar(interaction, client);
      case 'finalizar':
        return handleFinalizar(interaction, client);
      case 'proximo':
        return handleProximo(interaction, client);
      case 'skipar':
        return handleSkipar(interaction, client);
      case 'force':
        return handleForce(interaction, client);
      case 'rmcooldown':
        return handleRmcooldown(interaction, client);
    }
  }
};

async function handleAbrir(interaction, client) {
  if (isQueueOpen()) {
    return interaction.reply({ content: 'A fila ja esta aberta!', ephemeral: true });
  }

  setQueueOpen(true);
  addActiveTester(interaction.user.id);
  await interaction.reply({ content: 'Fila aberta!', ephemeral: true });

  updateFilaEmbed(client);
}

async function handleFechar(interaction, client) {
  if (!isQueueOpen()) {
    return interaction.reply({ content: 'A fila ja esta fechada!', ephemeral: true });
  }

  setQueueOpen(false);
  removeActiveTester(interaction.user.id);
  await interaction.reply({ content: 'Fila fechada!', ephemeral: true });

  updateFilaEmbed(client);
}

async function handleFinalizar(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const tier = interaction.options.getString('tier');

  const currentTest = getCurrentTest();
  if (!currentTest) {
    return interaction.editReply({ content: 'Nao ha teste em andamento!' });
  }

  const { getOne } = await import('../services/database.js');
  const testRaw = getOne('SELECT channel_id FROM active_tests WHERE user_id = ?', [currentTest.user_id]);

  if (!testRaw?.channel_id || interaction.channel.id !== testRaw.channel_id) {
    return interaction.editReply({ content: 'Use este comando apenas no canal do ticket de teste!' });
  }

  let previousRank = 'none';
  try {
    const guild = await client.guilds.fetch(config.guildId);
    const member = await guild.members.fetch({ user: currentTest.user_id, force: true });
    const tierOrder = ['LT5', 'HT5', 'LT4', 'HT4', 'LT3', 'HT3', 'LT2', 'HT2', 'LT1', 'HT1'];
    for (const t of tierOrder) {
      if (member.roles.cache.has(config.tierRoles[t])) {
        previousRank = t;
        break;
      }
    }
  } catch (err) {
    console.error('Erro ao buscar tier anterior:', err.message);
  }

  const result = finishTest(tier, interaction.user.id);

  if (result.error) {
    return interaction.editReply({ content: result.error });
  }

  const expira = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  await interaction.editReply({
    content: 'Teste finalizado! ' + result.username + ' ganhou tier **' + tier + '**. Cooldown de 10 dias ate ' + expira.toLocaleString('pt-BR') + '.'
  });

  if (testRaw?.channel_id) {
    try {
      const channel = await client.channels.fetch(testRaw.channel_id);
      if (channel) await channel.delete();
    } catch (err) {
      console.error('Erro ao deletar canal:', err);
    }
  }

  const roleId = config.tierRoles[tier];
  if (roleId) {
    try {
      const guild = await client.guilds.fetch(config.guildId);
      const member = await guild.members.fetch(result.userId);

      const tierOrder = ['LT5', 'HT5', 'LT4', 'HT4', 'LT3', 'HT3', 'LT2', 'HT2', 'LT1', 'HT1'];
      for (const t of tierOrder) {
        const oldRoleId = config.tierRoles[t];
        if (oldRoleId && oldRoleId !== roleId && member.roles.cache.has(oldRoleId)) {
          await member.roles.remove(oldRoleId);
        }
      }

      await member.roles.add(roleId);
    } catch (err) {
      console.error('Erro ao atribuir cargo:', err.message);
    }
  }

  setLastTested(result.userId);

  let resultsChannel;
  try {
    resultsChannel = await client.channels.fetch(config.resultsChannelId);
  } catch (err) {
    console.error('Erro ao buscar canal de resultados:', err.message);
  }
  if (resultsChannel) {
    const embed = createResultEmbed(result.userId, result.username || 'Unknown', tier, result.testerId, previousRank);
    try {
      const msg = await resultsChannel.send({
        content: '<@' + result.userId + '>',
        embeds: [embed]
      });
      await msg.react('👑');
      await msg.react('😊');
      await msg.react('😱');
      await msg.react('💀');
      await msg.react('😢');
    } catch (err) {
      console.error('Erro ao enviar resultado:', err.message);
    }
  } else {
    console.error('Canal de resultados nao encontrado! ID:', config.resultsChannelId);
  }

  updateFilaEmbed(client);
}

async function handleProximo(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const next = getNext(interaction.user.id);

  if (next && next.error) {
    return interaction.editReply({ content: next.error });
  }

  if (!next) {
    return interaction.editReply({ content: 'Nenhum jogador na fila!' });
  }

  try {
    const guild = await client.guilds.fetch(config.guildId);
    const evalChannel = await guild.channels.create({
      name: 'eval-' + next.username,
      reason: 'Teste de ' + next.username
    });

    await evalChannel.permissionOverwrites.edit(next.user_id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });

    await evalChannel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageMessages: true
    });

    const { runQuery: rq } = await import('../services/database.js');
    rq('UPDATE active_tests SET channel_id = ? WHERE user_id = ?', [evalChannel.id, next.user_id]);

    let currentTier = 'none';
    try {
      const member = await guild.members.fetch({ user: next.user_id, force: true });
      const tierOrder = ['LT5', 'HT5', 'LT4', 'HT4', 'LT3', 'HT3', 'LT2', 'HT2', 'LT1', 'HT1'];
      for (const t of tierOrder) {
        const roleId = config.tierRoles[t];
        if (roleId && member.roles.cache.has(roleId)) {
          currentTier = t;
          break;
        }
      }
    } catch (err) {
      console.error('Erro ao buscar tier:', err.message);
    }

    const { EmbedBuilder } = await import('discord.js');
    const skinUrl = 'https://mc-heads.net/avatar/' + next.username + '/128';

    const testEmbed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('Teste - ' + next.username)
      .setThumbnail(skinUrl)
      .addFields(
        { name: 'Tester:', value: '<@' + interaction.user.id + '>', inline: true },
        { name: 'Jogador:', value: '<@' + next.user_id + '>', inline: true },
        { name: 'Nick:', value: next.username, inline: true },
        { name: 'Servidor:', value: next.region || 'SA', inline: true },
        { name: 'Tier Atual:', value: currentTier, inline: true }
      )
      .setTimestamp();

    await evalChannel.send({ embeds: [testEmbed] });
  } catch (err) {
    console.error('Erro ao criar canal:', err);
  }

  await interaction.editReply({
    content: 'Testando: <@' + next.user_id + '>'
  });

  updateFilaEmbed(client);
}

async function handleSkipar(interaction, client) {
  await interaction.deferReply({ ephemeral: true });

  const { getOne } = await import('../services/database.js');
  const currentTest = getOne('SELECT user_id FROM active_tests LIMIT 1');
  let channelId = null;
  if (currentTest) {
    const testRaw = getOne('SELECT channel_id FROM active_tests WHERE user_id = ?', [currentTest.user_id]);
    channelId = testRaw && testRaw.channel_id;
  }

  if (!channelId || interaction.channel.id !== channelId) {
    return interaction.editReply({ content: 'Use este comando apenas no canal do ticket de teste!' });
  }

  const result = skipTest();

  if (result.error) {
    return interaction.editReply({ content: result.error });
  }

  if (channelId) {
    try {
      const channel = await interaction.client.channels.fetch(channelId);
      if (channel) await channel.delete();
    } catch (err) {
      console.error('Erro ao deletar canal:', err);
    }
  }

  await interaction.editReply({ content: 'Teste pulado!' });
  updateFilaEmbed(client);
}

async function handleForce(interaction, client) {
  const user = interaction.options.getUser('usuario');
  const position = interaction.options.getInteger('posicao');

  const result = forcePosition(user.id, position);

  if (result.error) {
    return interaction.reply({ content: result.error, ephemeral: true });
  }

  await interaction.reply({
    content: '<@' + user.id + '> movido para posicao **' + position + '**',
    ephemeral: true
  });

  updateFilaEmbed(client);
}

async function handleRmcooldown(interaction, client) {
  const user = interaction.options.getUser('usuario');

  removeCooldown(user.id);

  await interaction.reply({
    content: 'Cooldown de <@' + user.id + '> removido! Ele pode entrar na fila novamente.',
    ephemeral: true
  });
}

async function updateFilaEmbed(client) {
  const filaChannel = client.channels.cache.get(config.filaChannelId);
  if (!filaChannel) return;

  const queueList = getQueueList();
  const currentTest = getCurrentTest();
  const isOpen = isQueueOpen();

  const activeTesters = getAllActiveTesters().map(t => t.tester_id);

  const embed = createQueueEmbed(queueList, currentTest, isOpen, activeTesters);
  const roleMention = '<@&' + config.waitlistRoleId + '>';

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
