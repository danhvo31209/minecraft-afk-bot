const mineflayer = require('mineflayer');
const axios = require('axios');
const express = require('express');
const config = require('./config.json');

// ── Web server ─────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('<h1>Bot đang chạy!</h1>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌍 Web server đang chạy tại cổng ${PORT}`);
});

const RECONNECT_DELAY    = 60000;       // 1 phút
const ANTI_AFK_INTERVAL  = 30000;       // 30 giây
const KEEPALIVE_INTERVAL = 5 * 60000;   // 5 phút
const CLEANUP_CYCLE      = 5 * 60000;   // 5 phút
const KEEPALIVE_URL = 'https://magmanode.com/server?id=1041872#';

let bot;
let antiAfkTimer  = null;
let antiAfkPhase  = 0;
let cleanupTimers = [];

// ── Keep-alive: ping MagmaNode mỗi 5 phút ──────────────────────────────────
async function pingKeepalive() {
  try {
    const res = await axios.get(KEEPALIVE_URL, {
      timeout: 15000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      }
    });
    console.log(`🌐 Keep-alive ping OK (HTTP ${res.status})`);
  } catch (err) {
    const status = err.response ? err.response.status : null;
    if (status === 403 || status === 401) {
      console.log(`🌐 Keep-alive ping tới MagmaNode (HTTP ${status} — server đang hoạt động)`);
    } else if (status) {
      console.warn(`⚠️  Keep-alive ping: HTTP ${status}`);
    } else {
      console.warn(`⚠️  Keep-alive ping thất bại: ${err.message}`);
    }
  }
}

setInterval(pingKeepalive, KEEPALIVE_INTERVAL);
pingKeepalive();

// ── Dọn rác định kỳ 5 phút ────────────────────────────────────────────────
function stopCleanupCycle() {
  cleanupTimers.forEach(t => clearTimeout(t));
  cleanupTimers = [];
}

function startCleanupCycle() {
  stopCleanupCycle();

  cleanupTimers.push(setTimeout(() => {
    if (!bot || !bot.entity) return;
    bot.chat('[Hệ thống] Vật phẩm dưới đất sẽ bị xóa sau 60 giây!');
    console.log('🗑️  Dọn rác: cảnh báo 60 giây');
  }, CLEANUP_CYCLE - 60000));

  cleanupTimers.push(setTimeout(() => {
    if (!bot || !bot.entity) return;
    bot.chat('[Hệ thống] Vật phẩm dưới đất sẽ bị xóa sau 10 giây!');
    console.log('🗑️  Dọn rác: cảnh báo 10 giây');
  }, CLEANUP_CYCLE - 10000));

  cleanupTimers.push(setTimeout(() => {
    if (!bot || !bot.entity) return;
    bot.chat('/kill @e[type=item]');
    console.log('🗑️  Dọn rác: đã chạy /kill @e[type=item]');

    setTimeout(() => {
      if (!bot || !bot.entity) return;
      bot.chat('[Hệ thống] Đã dọn dẹp sạch sẽ vật phẩm rơi vãi!');
      console.log('✨ Dọn rác: hoàn tất, bắt đầu chu kỳ mới');
      startCleanupCycle();
    }, 1000);
  }, CLEANUP_CYCLE));
}

// ── Anti-AFK ───────────────────────────────────────────────────────────────
function startAntiAfk() {
  if (antiAfkTimer) clearInterval(antiAfkTimer);

  antiAfkTimer = setInterval(() => {
    if (!bot || !bot.entity) return;

    if (antiAfkPhase === 0) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.entity && bot.setControlState('jump', false), 500);
      console.log('🔄 Anti-AFK: nhảy');
    } else {
      const yaw = (bot.entity.yaw + Math.PI / 2) % (2 * Math.PI);
      bot.look(yaw, 0, false);
      console.log('🔄 Anti-AFK: xoay người');
    }

    antiAfkPhase = (antiAfkPhase + 1) % 2;
  }, ANTI_AFK_INTERVAL);
}

// ── Bot ────────────────────────────────────────────────────────────────────
function createBot() {
  bot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    auth: 'offline',
    version: false,
    viewDistance: config.botChunk
  });

  console.log(`🔌 Đang kết nối tới ${config.serverHost}:${config.serverPort}...`);

  bot.on('spawn', () => {
    console.log(`✅ ${config.botUsername} is Ready!`);
    startAntiAfk();
    startCleanupCycle();
  });

  bot.on('error', (err) => {
    console.error('⚠️  Lỗi kết nối:', err.message || err);
  });

  bot.on('end', (reason) => {
    console.log(`⛔️ Bot mất kết nối${reason ? ` (${reason})` : ''}. Thử lại sau ${RECONNECT_DELAY / 1000}s...`);
    if (antiAfkTimer) { clearInterval(antiAfkTimer); antiAfkTimer = null; }
    stopCleanupCycle();
    setTimeout(createBot, RECONNECT_DELAY);
  });

  bot.on('kicked', (reason) => {
    console.warn('🚫 Bot bị kick:', reason);
  });
}

createBot();
