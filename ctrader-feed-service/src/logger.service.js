const recentLogs = [];

function addLog(line) {
  recentLogs.push(line);
  if (recentLogs.length > 200) recentLogs.shift();
}

const logger = {
  info(tag, message, meta) {
    const metaStr = meta !== undefined && meta !== null ? ` | ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
    const line = `[INFO - ${tag}] ${message}${metaStr}`;
    console.log(`\x1b[36m[INFO - ${tag}]\x1b[0m ${message}${metaStr}`);
    addLog(line);
  },
  warn(tag, message, meta) {
    const metaStr = meta !== undefined && meta !== null ? ` | ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
    const line = `[WARN - ${tag}] ${message}${metaStr}`;
    console.warn(`\x1b[33m[WARN - ${tag}]\x1b[0m ${message}${metaStr}`);
    addLog(line);
  },
  error(tag, message, meta) {
    const errMsg = message instanceof Error ? message.message : message;
    const errMeta = meta instanceof Error ? meta.message : meta;
    const metaStr = errMeta ? ` | ${typeof errMeta === 'object' ? JSON.stringify(errMeta) : errMeta}` : '';
    const line = `[ERROR - ${tag}] ${errMsg}${metaStr}`;
    console.error(`\x1b[31m[ERROR - ${tag}]\x1b[0m ${errMsg}${metaStr}`);
    addLog(line);
  },
  http(req, res, durationMs) {
    const ms = Math.round(durationMs);
    if (res.statusCode >= 400) {
      console.error(`\x1b[31m[HTTP ${res.statusCode}]\x1b[0m ${req.method} ${req.originalUrl || req.url} (${ms}ms)`);
    } else {
      console.log(`\x1b[32m[HTTP 200]\x1b[0m ${req.method} ${req.originalUrl || req.url} (${ms}ms)`);
    }
  },
  getRecentLogs(lineCount = 200) {
    return recentLogs.slice(-lineCount);
  },
  getLogFilePath() {
    return 'in-memory';
  },
};

module.exports = logger;
