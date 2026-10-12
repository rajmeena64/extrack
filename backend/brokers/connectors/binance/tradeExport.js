const axios = require('axios');
const { createHash } = require('crypto');
const { decryptUserBrokerCredential } = require('../../../shared/utils/credentialEncryption');
const r2Storage = require('../../../shared/storage/r2');
const { unzipFirstFile } = require('../../../shared/utils/zip');
const repository = require('./repository');
const { assembleRoundTrips } = require('./roundTrips');
const { signedRequest } = require('./signedRequest');

const EXPORT_PATHS = {
  usdmFutures: { request: '/fapi/v1/trade/asyn', poll: '/fapi/v1/trade/asyn/id' },
  coinmFutures: { request: '/dapi/v1/trade/asyn', poll: '/dapi/v1/trade/asyn/id' },
};

function parseCsv(csv) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"' && quoted && csv[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(value); value = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const headerKey = (value) => String(value || '').replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const optionalNumber = (value) => {
  const number = Number(String(value ?? '').trim().replace(/%$/, ''));
  return String(value ?? '').trim() && Number.isFinite(number) ? number : undefined;
};
const unixMilliseconds = (value) => {
  const text = String(value ?? '').trim();
  const numeric = Number(text);
  if (Number.isSafeInteger(numeric)) return numeric;
  return Date.parse(/(?:z|utc|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text.replace(' ', 'T')}Z`);
};

function parseTradeExportCsv(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map(headerKey);
  const pick = (record, ...names) => {
    const index = names.map(headerKey).map((name) => headers.indexOf(name)).find((candidate) => candidate >= 0);
    return index === undefined ? undefined : record[index];
  };
  return rows.slice(1).map((record) => {
    const rawTime = pick(record, 'time', 'timestamp', 'time utc', 'date utc', 'date');
    const time = unixMilliseconds(rawTime);
    return {
      symbol: pick(record, 'symbol'),
      id: pick(record, 'id', 'trade id'),
      orderId: pick(record, 'order id'),
      side: pick(record, 'side'),
      price: pick(record, 'price'),
      qty: pick(record, 'qty', 'quantity', 'executed qty'),
      realizedPnl: pick(record, 'realized pnl', 'realized profit'),
      pnlCurrency: pick(record, 'pnl asset', 'realized pnl asset', 'profit asset', 'margin asset', 'settlement asset'),
      commission: pick(record, 'commission', 'fee'),
      commissionAsset: pick(record, 'commission asset', 'fee asset'),
      positionSide: pick(record, 'position side'),
      percentChange: optionalNumber(pick(record, 'percent change', 'pnl percent', 'roe')),
      stopLoss: optionalNumber(pick(record, 'stop loss', 'stop price')),
      takeProfit: optionalNumber(pick(record, 'take profit', 'profit target', 'target price')),
      time,
    };
  }).filter((trade) => trade.symbol && trade.id !== undefined && trade.side && trade.price && trade.qty && Number.isSafeInteger(trade.time));
}

async function credentialsFor(userId, connectionId, dependencies) {
  const credential = await (dependencies.getCredential || repository.getCredentialByConnection)(userId, connectionId);
  if (!credential) throw Object.assign(new Error('Connect Binance before requesting history'), { code: 'BINANCE_CONNECTION_REQUIRED' });
  try {
    const stored = JSON.parse((dependencies.decrypt || decryptUserBrokerCredential)(credential.encryptedPayload, `binance:user:${userId}`));
    if (typeof stored.apiKey !== 'string' || !stored.apiKey || typeof stored.secretKey !== 'string' || !stored.secretKey) throw new Error();
    return { ...stored, environment: credential.environment || 'real' };
  } catch {
    throw Object.assign(new Error('Stored Binance credentials are unavailable'), { code: 'SERVICE_UNAVAILABLE' });
  }
}

async function requestTradeExport(userId, connectionId, market, startTime, endTime, dependencies = {}) {
  const repo = dependencies.repository || repository;
  const existing = await repo.findTradeExport(userId, connectionId, market, startTime, endTime);
  if (existing?.r2ObjectKey) {
    try {
      return await importArchivedExport(userId, connectionId, market, startTime, endTime, existing, dependencies);
    } catch (error) {
      if (!['R2_OBJECT_MISSING', 'R2_ARCHIVE_CORRUPT'].includes(error.code)) throw error;
    }
  }
  if (existing && existing.status !== 'imported') return { ...existing, status: 'processing' };
  const credentials = await credentialsFor(userId, connectionId, { ...dependencies, getCredential: repo.getCredentialByConnection });
  const response = await (dependencies.request || signedRequest)({
    market, path: EXPORT_PATHS[market].request, ...credentials, params: { startTime, endTime },
  });
  const downloadId = String(response?.downloadId || '');
  if (!/^\d{1,100}$/.test(downloadId)) throw Object.assign(new Error('Unexpected Binance export response'), { code: 'SERVICE_UNAVAILABLE' });
  return repo.saveTradeExport(userId, connectionId, market, startTime, endTime, downloadId);
}

function safeDownloadUrl(value) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !(host.endsWith('.binance.com') || host.endsWith('.amazonaws.com') || host.endsWith('.cloudfront.net'))) {
    throw Object.assign(new Error('Unexpected Binance download URL'), { code: 'SERVICE_UNAVAILABLE' });
  }
  return url.toString();
}

async function downloadTradeExport(url, client = axios, onArchive) {
  // ponytail: buffer one annual export; switch to streaming unzip if real exports exceed 200 MB.
  const response = await client.get(safeDownloadUrl(url), {
    responseType: 'arraybuffer', timeout: 30000, maxContentLength: 200 * 1024 * 1024,
  });
  const buffer = Buffer.from(response.data);
  if (onArchive) await onArchive(buffer, response.headers?.['content-type']);
  return parseTradeExportBuffer(buffer);
}

function isZip(buffer) {
  return buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50;
}

function parseTradeExportBuffer(buffer) {
  const csv = isZip(buffer) ? unzipFirstFile(buffer) : buffer.toString('utf8');
  return parseTradeExportCsv(csv);
}

const archiveHash = (buffer) => createHash('sha256').update(buffer).digest('hex');

function archiveKey(state, market, startTime, endTime, buffer) {
  if (!state.connectionId) throw Object.assign(new Error('Binance connection was not found for archive'), { code: 'SERVICE_UNAVAILABLE' });
  return ['binance-history', state.connectionId, market, `${startTime}_${endTime}`, `${state.downloadId}.${isZip(buffer) ? 'zip' : 'csv'}`].join('/');
}

async function importArchivedExport(userId, connectionId, market, startTime, endTime, state, dependencies = {}) {
  const repo = dependencies.repository || repository;
  const storage = dependencies.storage || r2Storage;
  const buffer = await storage.getObject(state.r2ObjectKey);
  if ((state.archiveSizeBytes !== undefined && Number(state.archiveSizeBytes) !== buffer.length)
    || (state.archiveSha256 && state.archiveSha256 !== archiveHash(buffer))) {
    throw Object.assign(new Error('R2 trade archive failed its integrity check'), { code: 'R2_ARCHIVE_CORRUPT' });
  }
  const trades = parseTradeExportBuffer(buffer);
  const savedCount = await (dependencies.saveTrades || repo.saveTrades)(userId, connectionId, market, assembleRoundTrips(market, trades));
  await repo.updateTradeExport(userId, connectionId, market, startTime, endTime, {
    status: 'imported', lastReplayedAt: new Date().toISOString(),
  });
  return { ...state, status: 'imported', fetchedCount: trades.length, savedCount, source: 'r2' };
}

async function pollTradeExport(userId, connectionId, market, startTime, endTime, dependencies = {}) {
  const repo = dependencies.repository || repository;
  const state = await repo.findTradeExport(userId, connectionId, market, startTime, endTime);
  if (!state) throw Object.assign(new Error('Request Binance history before polling'), { code: 'VALIDATION_FAILED' });
  if (state.status === 'imported') return { ...state, savedCount: 0 };
  if (state.r2ObjectKey) return importArchivedExport(userId, connectionId, market, startTime, endTime, state, dependencies);
  const credentials = await credentialsFor(userId, connectionId, { ...dependencies, getCredential: repo.getCredentialByConnection });
  const response = await (dependencies.request || signedRequest)({
    market, path: EXPORT_PATHS[market].poll, ...credentials, params: { downloadId: state.downloadId },
  });
  if (response?.status === 'processing') return state;
  if (response?.status !== 'completed' || !response.url) throw Object.assign(new Error('Unexpected Binance export status'), { code: 'SERVICE_UNAVAILABLE' });
  await repo.updateTradeExport(userId, connectionId, market, startTime, endTime, 'completed');
  const trades = await (dependencies.download || downloadTradeExport)(response.url, dependencies.httpClient || axios, async (buffer, contentType) => {
    const storage = dependencies.storage || r2Storage;
    const key = archiveKey(state, market, startTime, endTime, buffer);
    const archived = await storage.putObject({
      key, body: buffer, contentType: contentType || (isZip(buffer) ? 'application/zip' : 'text/csv'),
    });
    await repo.updateTradeExport(userId, connectionId, market, startTime, endTime, {
      status: 'archived', r2ObjectKey: key, r2Etag: archived.etag,
      archiveSizeBytes: buffer.length, archiveSha256: archiveHash(buffer), archivedAt: new Date().toISOString(),
    });
  });
  const roundTrips = assembleRoundTrips(market, trades);
  const savedCount = await (dependencies.saveTrades || repo.saveTrades)(userId, connectionId, market, roundTrips);
  await repo.updateTradeExport(userId, connectionId, market, startTime, endTime, 'imported');
  return { ...state, status: 'imported', fetchedCount: trades.length, savedCount };
}

module.exports = {
  archiveKey, downloadTradeExport, importArchivedExport, parseTradeExportBuffer, parseTradeExportCsv,
  pollTradeExport, requestTradeExport, safeDownloadUrl,
};
