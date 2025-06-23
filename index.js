require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Telegraf } = require('telegraf');

const app = express();
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

app.use(express.json());

bot.start((ctx) => ctx.reply('🤖 Bot attivo e pronto!'));
bot.command('status', (ctx) => ctx.reply('✅ Bot in esecuzione.'));

app.post('/webhook', async (req, res) => {
  const data = req.body;
  try {
    const { pair, type } = data;
    await bot.telegram.sendMessage(
      process.env.TELEGRAM_CHAT_ID,
      `🔔 Segnale ricevuto:\nCoppia: ${pair}\nTipo: ${type}`
    );
    res.status(200).send('Segnale ricevuto');
  } catch (error) {
    console.error('Errore Telegram:', error.response?.data || error.message);
    res.status(500).send('Errore Telegram');
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
  bot.launch();
});