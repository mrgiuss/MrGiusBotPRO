
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;

const sendTelegram = async (msg) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text: msg,
    parse_mode: 'Markdown'
  });
};

const signRequest = (params, secret) => {
  return crypto.createHmac('sha256', secret).update(params).digest('hex');
};

app.post('/webhook', async (req, res) => {
  const {
    pair,
    symbol,
    type,
    side,
    leverage,
    size,
    tp,
    sl,
    trail,
    timeout
  } = req.body;

  const _pair = pair || symbol;
  const _type = type || (side === "buy" ? "long" : "short");

  if (!_pair || !_type || !leverage || !size) {
    return res.status(400).send("Missing data");
  }

  try {
    const orderSide = _type === "long" ? "Buy" : "Sell";
    const symbolFormatted = _pair.replace(".P", "");
    const timestamp = Date.now();
    const query = `apiKey=${BYBIT_API_KEY}&recvWindow=5000&timestamp=${timestamp}`;
    const signature = signRequest(query, BYBIT_API_SECRET);

    const order = {
      category: "linear",
      symbol: symbolFormatted,
      side: orderSide,
      orderType: "Market",
      qty: size,
      timeInForce: "GTC",
      takeProfit: (tp * size).toFixed(2),
      stopLoss: (sl * size).toFixed(2),
      tpTriggerBy: "LastPrice",
      slTriggerBy: "LastPrice"
    };

    await axios.post(`https://api.bybit.com/v5/order/create?${query}&sign=${signature}`, order);

    await sendTelegram(`✅ *Ordine inviato a Bybit*
*${_pair}* - *${_type.toUpperCase()}*
Leva: ${leverage}x | Size: ${size}`);
    res.send("Order sent");
  } catch (error) {
    console.error("Errore:", error.message || error);
    await sendTelegram(`❌ *Errore invio ordine:* ${error.message}`);
    res.status(500).send("Errore invio ordine");
  }
});

app.listen(10000, () => console.log("🚀 Bot attivo su porta 10000"));
