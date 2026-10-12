const path = require('path');
const { getDiagnostics } = require('../infra/entrackmicro/feedservice');

async function main() {
  const t0 = Date.now();

  try {
    const data = await getDiagnostics();
    const duration = Date.now() - t0;

    const startedAt = data.uptime?.startedAtIST || '-';
    const uptimeStr = data.uptime?.uptimeHuman || '-';
    const serverTimeStr = data.timestamp
      ? new Date(data.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      : '-';

    console.log(`[FEED SERVICE DIAGNOSTICS] (${duration}ms)`);
    console.log(`SERVICE:    ${data.service} v${data.version}`);
    console.log(`STATUS:     ${data.ctrader?.connected ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`STARTED:    ${startedAt} (${uptimeStr})`);
    console.log(`TIME:       ${serverTimeStr}`);

    const tokenDays = data.ctrader?.token?.expiresInSeconds
      ? `${Math.floor(data.ctrader.token.expiresInSeconds / 86400)}d`
      : '-';

    console.log(`\n[CTRADER INTEGRATION]`);
    console.log(`SOCKET:     ${data.ctrader?.connected ? 'AUTHED' : 'OFFLINE'}`);
    console.log(`ACCOUNT:    ${data.ctrader?.accountId || '-'} (${data.ctrader?.isDemo ? 'DEMO' : 'LIVE'})`);
    console.log(`TOKEN:      ${data.ctrader?.token?.hasAccessToken ? `VALID (${tokenDays} remaining)` : 'MISSING'}`);
    console.log(`SYMBOLS:    ${data.ctrader?.totalBrokerSymbolsAvailable ?? 0} mapped`);
    console.log(`STREAMS:    ${data.ctrader?.activeSubscriptionsCount ?? 0} active subscriptions`);

    console.log(`\n[RAM BUFFER METRICS]`);
    console.log(`CAPACITY:   ${data.cache?.maxRollingCandlesPerSymbol ?? 1440} candles/symbol (24h)`);
    console.log(`PAIRS:      ${data.cache?.cachedKeysCount ?? 0} active`);
    console.log(`CANDLES:    ${data.cache?.totalCandlesInMemory ?? 0} in memory`);
    console.log(`CACHE MEM:  ${data.cache?.estimatedCacheMemoryMB ?? 0} MB`);

    const symbolsList = Array.isArray(data.cache?.symbols) ? data.cache.symbols : [];
    const oneMinSymbols = symbolsList.filter((s) => s.interval === '1m');

    if (oneMinSymbols.length > 0) {
      console.log(`\n[ACTIVE 1M ROLLING SYMBOLS] (${oneMinSymbols.length})`);
      console.table(
        oneMinSymbols.map((s) => ({
          Symbol: s.symbol,
          Candles: s.candleCount,
          'First Bar (IST)': s.firstCandleTime
            ? new Date(s.firstCandleTime * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
            : '-',
          'Last Bar (IST)': s.lastCandleTime
            ? new Date(s.lastCandleTime * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })
            : '-',
          'Last Price': Number(s.lastPrice),
        }))
      );
    }

    console.log(`\n[SYSTEM & HARDWARE]`);
    console.log(`HEAP:       ${data.system?.processMemory?.heapUsedMB ?? '-'} MB / ${data.system?.processMemory?.heapTotalMB ?? '-'} MB`);
    console.log(`RSS:        ${data.system?.processMemory?.rssMB ?? '-'} MB`);
    console.log(`HOST RAM:   ${data.system?.hostMemory?.freeMB ?? '-'} MB free / ${data.system?.hostMemory?.totalMB ?? '-'} MB total (${data.system?.hostMemory?.usedPercent ?? '-'} used)`);
    console.log(`CPU LOAD:   ${data.system?.loadAverage?.join(', ') || '-'}`);

    console.log(`\n[THROUGHPUT]`);
    console.log(`REQUESTS:   ${data.throughput?.totalRequestsHandled ?? 0}`);
    console.log(`TICKS RECV: ${data.throughput?.totalTicksReceived ?? 0} (${data.throughput?.liveTicksPerSecond ?? 0} ticks/sec)\n`);

    process.exit(0);
  } catch (err) {
    console.error(`\n[ERROR] Diagnostics fetch failed: ${err.message}`);
    if (err.response?.data) {
      console.error('RESPONSE:', err.response.data);
    }
    process.exit(1);
  }
}

main();
