import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

export function createRequestEmbed() {
  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('Sistema de Testes')
    .setDescription(
      '**Bem-vindo ao sistema de avaliacao!**\n\n' +
      '```\n' +
      '  1  Clique em Registrar\n' +
      '  2  Informe seu nick e regiao\n' +
      '  3  Acesse a fila e aguarde\n' +
      '  4  Será testado por um avaliador\n' +
      '```\n\n' +
      '> Apos o registro voce tera acesso ao canal de fila.'
    )
    .setFooter({ text: 'Sem registro = sem acesso a fila' })
    .setTimestamp();
}

export function createRegionSelectEmbed() {
  return new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle('Selecione seu Servidor')
    .setDescription('Escolha a regiao do servidor onde voce deseja testar:');
}

export function createQueueEmbed(queueList, currentTest, isOpen, activeTesters, region) {
  region = region || 'SA';
  activeTesters = activeTesters || [];

  const embed = new EmbedBuilder()
    .setTimestamp();

  const queueCount = queueList.length;
  const testerCount = activeTesters.length;

  if (isOpen) {
    embed
      .setColor('#57f287')
      .setTitle(region + ' Waitlist')
      .setDescription('**Testers disponiveis para testar**');

    let testerText = 'Nenhum online';
    if (testerCount > 0) {
      testerText = activeTesters.map(id => '<@' + id + '>').join('\n');
    }

    let filaText = 'Nenhum na fila';
    if (queueCount > 0) {
      filaText = queueList.map((user, i) => '`' + (i + 1) + '` <@' + user.user_id + '>').join('\n');
    }

    embed.addFields(
      { name: 'Testers [' + testerCount + '/5]', value: testerText, inline: true },
      { name: 'Fila [' + queueCount + '/5]', value: filaText, inline: false }
    );
  } else {
    embed
      .setColor('#ed4245')
      .setTitle('Waitlist')
      .setDescription(
        '**Testers off-line**\n\n' +
        'Nenhum testador disponivel no momento.\nVolte mais tarde!'
      );

    const d = new Date();
    const data = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    embed.setFooter({ text: 'Ultimo teste: ' + data });
  }

  return embed;
}

export function createResultEmbed(userId, username, tier, testerId, previousRank) {
  previousRank = previousRank || 'none';

  return new EmbedBuilder()
    .setColor('#808080')
    .setTitle(username + 's Resultado.')
    .setThumbnail('https://mc-heads.net/avatar/' + username + '/128')
    .addFields(
      { name: 'Tester:', value: '<@' + testerId + '>', inline: false },
      { name: 'Minecraft Nome:', value: username, inline: false },
      { name: 'Rank anterior:', value: previousRank, inline: false },
      { name: 'Novo rank:', value: tier, inline: false }
    )
    .setTimestamp();
}
