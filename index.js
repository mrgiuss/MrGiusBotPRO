
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
    const { pair, type } = req.body;

    const text = `🔔 Segnale ricevuto:\nCoppia: ${pair}\nTipo: ${type}`;
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: 'Markdown',
    });

    res.status(200).send('Messaggio inviato a Telegram');
  } catch (error) {
    console.error('Errore Telegram:', error.response?.data || error.message);
    res.status(500).send('Errore nel webhook');
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});
