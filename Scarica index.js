require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { Telegraf } = require('telegraf');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BYBIT_API_KEY = process.env.BYBIT_API_KEY;
const BYBIT_API_SECRET = process.env.BYBIT_API_SECRET;

// Inizializza il bot Telegram
const bot = new Telegraf(TELEGRAM_TOKEN);

const sendTelegram = async (msg) => {
  await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, msg, { parse_mode: 'Markdown' });
};

// Funzione per generare la firma Bybit
const signRequest = (params, secret) => {
  return crypto.createHmac('sha256', secret).update(params).digest('hex');
};

// Funzione per piazzare un ordine
const placeOrder = async (symbol, side, qty, leverage) => {
  const timestamp = Date.now();
  const query = `api_key=${BYBIT_API_KEY}×tamp=${timestamp}&recv_window=5000`;
  const signature = signRequest(query, BYBIT_API_SECRET);

  const order = {
    category: "linear",
    symbol: symbol,
    side: side,
    orderType: "Market",
    qty: qty,
    leverage: leverage,
    timeInForce: "GoodTillCancel",
    positionIdx: 0
  };

  try {
    const response = await axios.post(
      'https://api-testnet.bybit.com/v5/order/create',
      order,
      {
        headers: { 'Content-Type': 'application/json' },
        params: {
          api_key: BYBIT_API_KEY,
          timestamp: timestamp,
          sign: signature,
          recv_window: 5000
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Errore ordine: ${error.response?.data?.retMsg || error.message}`);
  }
};

// Funzione per impostare TP/SL
const setTPSL = async (symbol, side, qty, takeProfit, stopLoss) => {
  const timestamp = Date.now();
  const query = `api_key=${BYBIT_API_KEY}×tamp=${timestamp}&recv_window=5000`;
  const signature = signRequest(query, BYBIT_API_SECRET);

  const tpSl = {
    category: "linear",
    symbol: symbol,
    side: side === "Buy" ? "Buy" : "Sell",
    takeProfit: takeProfit,
    stopLoss: stopLoss,
    tpTriggerBy: "LastPrice",
    slTriggerBy: "LastPrice",
    reduceOnly: false,
    positionIdx: 0
  };

  try {
    const response = await axios.post(
      'https://api-testnet.bybit.com/v5/position/set-auto-add-margin',
      tpSl,
      {
        headers: { 'Content-Type': 'application/json' },
        params: {
          api_key: BYBIT_API_KEY,
          timestamp: timestamp,
          sign: signature,
          recv_window: 5000
        }
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Errore TP/SL: ${error.response?.data?.retMsg || error.message}`);
  }
};

// Webhook per segnali manuali
app.post('/webhook', async (req, res) => {
  const { action, pair } = req.body;

  if (!action || !pair) {
    return res.status(400).send("Manca action o pair");
  }

  const symbol = pair.toUpperCase().replace("PERPETUAL", "");
  const side = action.toLowerCase() === "long" ? "Buy" : "Sell";
  const leverage = 10;
  const positionValue = 20000;
  const qty = (positionValue / leverage);
  const initialTP = 800;
  const initialSL = 200;

  try {
    await placeOrder(symbol, side, qty, leverage);
    await sendTelegram(`✅ *Ordine inviato a Bybit*\n*${symbol}* - *${action.toUpperCase()}*\nLeva: ${leverage}x | Size: ${qty} | TP: ${initialTP} | SL: ${initialSL}`);

    let profit = 0;
    const checkProfit = async () => {
      const response = await axios.get(
        'https://api-testnet.bybit.com/v5/position/list',
        {
          params: {
            api_key: BYBIT_API_KEY,
            timestamp: Date.now(),
            sign: signRequest(`api_key=${BYBIT_API_KEY}×tamp=${Date.now()}&recv_window=5000`, BYBIT_API_SECRET),
            recv_window: 5000,
            category: "linear",
            symbol: symbol
          }
        }
      );
      profit = response.data.result.list[0]?.unrealisedPnl || 0;
      if (profit >= initialTP) {
        await setTPSL(symbol, side, qty, 1500, 750);
        await sendTelegram(`🎉 *TP/SL aggiornati*\n*${symbol}* - TP: 1500 | SL: +750`);
        clearInterval(interval);
      }
    };

    const interval = setInterval(checkProfit, 60000);
    res.send("Ordine inviato, monitoraggio attivo");
  } catch (error) {
    console.error("Errore:", error.message);
    await sendTelegram(`❌ *Errore:* ${error.message}`);
    res.status(500).send("Errore nell'ordine");
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Bot attivo su porta ${PORT}`));

bot.launch();
console.log("Bot Telegram avviato");