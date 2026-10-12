const { connectionState, ctraderConfig } = require('./ctrader/state');
const { getTinybirdSymbols } = require('./feed-cache.service');
const { getCandlesInsertedLastHour } = require('./tinybird-ingest.service');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
let monitorInterval = null;

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || parts.length === 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendTelegramAlert(title, message, isError = true) {
  const icon = isError ? '🔴' : '🟢';
  const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
  return sendTelegramMessage(`${icon} <b>cTrader Feed Alert: ${title}</b>\n\n${message}\n\n<b>Time (IST):</b> ${istTime}`);
}

async function sendHourlyStatusReport(startTime) {
  const isWs = Boolean(connectionState?.ws && connectionState.ws.readyState === 1);
  const isAuthed = Boolean(ctraderConfig?.isAppAuthed && ctraderConfig?.isAccountAuthed);
  const statusText = isWs && isAuthed ? '🟢 Active (Connected & Authorized)' : isWs ? '🟡 Connected (Pending Auth)' : '🔴 Disconnected';

  const uptimeSec = startTime ? Math.floor((Date.now() - new Date(startTime).getTime()) / 1000) : Math.floor(process.uptime());
  const uptimeStr = formatUptime(uptimeSec);

  const activeSymbolsCount = ctraderConfig?.liveTickSubscriptions?.size || 0;
  const totalBrokerSymbols = ctraderConfig?.symbols?.size || 0;

  const tbSymbols = typeof getTinybirdSymbols === 'function' ? getTinybirdSymbols() : [];
  const candlesInserted = typeof getCandlesInsertedLastHour === 'function' ? getCandlesInsertedLastHour() : 0;

  const mem = process.memoryUsage();
  const heapMb = (mem.heapUsed / (1024 * 1024)).toFixed(1);
  const rssMb = (mem.rss / (1024 * 1024)).toFixed(1);

  const istTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

  const message = [
    '📊 <b>cTrader Feed Service — Hourly Report</b>',
    '',
    `<b>Status:</b> ${statusText}`,
    `<b>Uptime:</b> ${uptimeStr}`,
    `<b>Time (IST):</b> ${istTime}`,
    '',
    `📈 <b>Active Live Feed Symbols:</b> ${activeSymbolsCount} / ${totalBrokerSymbols}`,
    `💾 <b>Database Ingestion Symbols:</b> ${tbSymbols.length}`,
    tbSymbols.length > 0 ? `<i>(${tbSymbols.join(', ')})</i>` : '',
    `🕯 <b>Candles Inserted (Past 1h):</b> ${candlesInserted}`,
    '',
    `⚡ <b>RAM:</b> Heap ${heapMb} MB | RSS ${rssMb} MB`,
  ].filter(Boolean).join('\n');

  await sendTelegramMessage(message);
}

function startTelegramMonitor(options = {}) {
  const startedAt = options.startedAt || new Date();
  setTimeout(() => {
    sendHourlyStatusReport(startedAt).catch(() => {});
  }, 15000);

  if (monitorInterval) clearInterval(monitorInterval);
  monitorInterval = setInterval(() => {
    sendHourlyStatusReport(startedAt).catch(() => {});
  }, 60 * 60 * 1000);
  monitorInterval.unref?.();
}

module.exports = {
  startTelegramMonitor,
  sendHourlyStatusReport,
  sendTelegramMessage,
  sendTelegramAlert,
};
