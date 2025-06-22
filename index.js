const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BYBIT_API_KEY = process.env.BYBIT_API_KEY || 'abc123';
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET || 'xyz456';

// Webhook TradingView
app.post('/webhook', async (req, res) => {
  try {
    const { pair, type, leverage, size, tp, sl, trail, timeout } = req.body;

    if (!pair || !type || !leverage || !size) {
      return res.status(400).send('Dati incompleti');
    }

    const text = `🚀 ${type.toUpperCase()} ${pair}\nLeva: ${leverage}x\nSize: ${size}\nTP: ${tp * 100}% / SL: ${sl * 100}%`;

    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'Markdown',
    });

    console.log('Messaggio Telegram inviato:', text);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Errore Telegram:', error.response?.data || error.message);
    res.status(500).send('Errore');
  }
});

app.get("/", (req, res) => {
  res.send("MrGiusBotPRO attivo.");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Bot avviato sulla porta ${PORT}`);
});