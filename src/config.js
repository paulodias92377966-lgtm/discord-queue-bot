import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN || 'MTUzMDI5MzI3NTY4MzE5Njk3OA.GilGBr.PFgCqT4Qb-5NMgRxNLdo9GPzdE9XgtNAmRoFKM',
  clientId: process.env.CLIENT_ID || '1530293275683196978',
  guildId: process.env.GUILD_ID || '1530288201539784824',
  testerRoleId: process.env.TESTER_ROLE_ID || '1530297522889818282',
  filaChannelId: process.env.FILA_CHANNEL_ID || '1530297649251614740',
  resultsChannelId: process.env.RESULTS_CHANNEL_ID || '1530297665777041540',
  requestChannelId: process.env.REQUEST_CHANNEL_ID || '1530297700447293612',
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
