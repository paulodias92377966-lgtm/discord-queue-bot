import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  testerRoleId: process.env.TESTER_ROLE_ID,
  filaChannelId: process.env.FILA_CHANNEL_ID,
  resultsChannelId: process.env.RESULTS_CHANNEL_ID,
  requestChannelId: process.env.REQUEST_CHANNEL_ID,
  waitlistRoleId: '1530332533034844344',
  evalCategoryId: '1530339417838059772',
  tiers: ['HT1', 'HT2', 'HT3', 'HT4', 'HT5', 'LT1', 'LT2', 'LT3', 'LT4', 'LT5'],
  tierRoles: {
    'HT1': '1530289959687426048',
    'LT1': '1530289948090175519',
    'HT2': '1530289937000173751',
    'LT2': '1530289922991325325',
    'HT3': '1530289911784144906',
    'LT3': '1530289899679252550',
    'HT4': '1530289791617204387',
    'LT4': '1530289775691432007',
    'HT5': '1530289760558645288',
    'LT5': '1530289711162331146'
  }
};
