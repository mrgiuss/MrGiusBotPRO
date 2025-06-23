
require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const app = express();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!botToken) {
  console.error("❌ BOT TOKEN mancante! Verifica la variabile TELEGRAM_BOT_TOKEN su Render.");
  process.exit(1);
}

const bot = new Telegraf(botToken);

app.use(express.json());

app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log("✅ Webhook ricevuto:", body);

    if (body && body.pair && body.type) {
      const message = `📈 Segnale ricevuto:\nCoppia: ${body.pair}\nTipo: ${body.type}`;
      await bot.telegram.sendMessage(chatId, message);
      res.status(200).send('Messaggio inviato ✅');
    } else {
      res.status(400).send('Formato non valido ❌');
    }
  } catch (error) {
    console.error("Errore nell'invio Telegram:", error);
    res.status(500).send('Errore interno ❌');
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Server in ascolto sulla porta ${port}`);
});
