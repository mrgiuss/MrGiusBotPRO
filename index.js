const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // Inserire il proprio ID utente
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;

// Webhook per TradingView
app.post('/webhook', async (req, res) => {
    const { pair, type, leverage, size, tp, sl, trail, timeout } = req.body;

    if (!pair || !type) {
        return res.status(400).send("Missing pair or type");
    }

    // Invia un messaggio su Telegram
    const text = `🚀 Segnale ricevuto: ${type.toUpperCase()} su ${pair} con leva ${leverage}x e size ${size}`;
    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: TELEGRAM_CHAT_ID,
            text
        });
        res.status(200).send("Messaggio Telegram inviato");
    } catch (error) {
        console.error("Errore Telegram:", error.response ? error.response.data : error.message);
        res.status(500).send("Errore invio Telegram");
    }
});

app.get("/", (req, res) => {
    res.send("MrGiusBotPRO attivo.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});