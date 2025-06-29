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

const bot = new Telegraf(TELEGRAM_TOKEN);

const sendTelegram = async (msg) => {
  await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, msg, { parse_mode: 'Markdown' });
};

const signRequest = (params, secret) => {
  return crypto.createHmac('sha256', secret).update(params).digest('hex');
};

const getMarketPrice = async (symbol) => {
  try {
    const response = await axios.get('https://api-testnet.bybit.com/v5/market/tickers', {
      params: {
        category: "linear",
        symbol: symbol
      }
    });
    return parseFloat(response.data.result.list[0].lastPrice);
  } catch (error) {
    throw new Error("Errore nel recupero del prezzo di mercato");
  }
};

const placeOrder = async (symbol, side, qty, leverage) => {
  const timestamp = Date.now();
  const query = `api_key=${BYBIT_API_KEY}&timestamp=${timestamp}&recv_window=5000`;
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

const setTPSL = async (symbol, side, takeProfit, stopLoss) => {
  const timestamp = Date.now();
  const query = `api_key=${BYBIT_API_KEY}&timestamp=${timestamp}&recv_window=5000`;
  const signature = signRequest(query, BYBIT_API_SECRET);

  const tpSl = {
    category: "linear",
    symbol: symbol,
    takeProfit: takeProfit.toString(),
    stopLoss: stopLoss.toString(),
    tpTriggerBy: "LastPrice",
    slTriggerBy: "LastPrice",
    positionIdx: 0
  };

  try {
    const response = await axios.post(
      'https://api-testnet.bybit.com/v5/position/set-tpsl',
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

app.post('/webhook', async (req, res) => {
  const { action, pair } = req.body;

  if (!action || !pair) {
    return res.status(400).send("Manca action o pair");
  }

  const symbol = pair.toUpperCase().replace("PERPETUAL", "");
  const side = action.toLowerCase() === "long" ? "Buy" : "Sell";
  const leverage = 10;
  const positionValue = 20000;

  try {
    const marketPrice = await getMarketPrice(symbol);
    const qty = (positionValue / marketPrice).toFixed(3);
    const initialTP = marketPrice + (1000 / parseFloat(qty));
    const initialSL = marketPrice - (200 / parseFloat(qty));

    await placeOrder(symbol, side, qty, leverage);
    await setTPSL(symbol, side, initialTP, initialSL);
    await sendTelegram(`✅ *Ordine inviato a Bybit*\n*${symbol}* - *${action.toUpperCase()}*\nLeva: ${leverage}x | Qty: ${qty} | TP: ${initialTP.toFixed(2)} | SL: ${initialSL.toFixed(2)}`);
    res.send("Ordine con TP/SL inviato");
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