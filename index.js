const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 10000;

app.use(bodyParser.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;

app.post('/webhook', async (req, res) => {
    const data = req.body;
    if (!data.pair || !data.type) {
        return res.status(400).send('Invalid payload');
    }

    const message = `📢 Segnale ricevuto:\nCoppia: ${data.pair}\nTipo: ${data.type}`;
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

    try {
        await axios.post(telegramUrl, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message
        });

        console.log(`Messaggio Telegram inviato: ${message}`);
        res.sendStatus(200);
    } catch (err) {
        console.error('Errore Telegram:', err.response?.data || err.message);
        res.sendStatus(500);
    }
});

app.listen(port, () => {
    console.log(`Server in ascolto sulla porta ${port}`);
});