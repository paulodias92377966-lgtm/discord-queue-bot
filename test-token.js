import 'dotenv/config';

async function testToken() {
  try {
    const res = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { 'Authorization': `Bot ${process.env.DISCORD_TOKEN}` }
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testToken();
