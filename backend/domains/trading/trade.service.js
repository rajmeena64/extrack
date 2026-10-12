const fs = require('fs');
const pool = require('../../infra/db/supabase');
const cloudinary = require('../../infra/cache/cloudinary');
const { trimString, finiteNumber } = require('../../api/validators/common');
const { UUID_PATTERN } = require('../../brokers/connections/connectionValidation');
const { getInstrument } = require('../../instruments/instrumentRegistry');
const { parseOptionContractSymbol } = require('../../shared/utils/optionContracts');
const { EMPTY_DOC, sanitizeJournalContent } = require('../../shared/utils/journalContent');
const {
  buildNormalizedTradeResponse,
  calculateTradePnl,
  firstValue,
  mapConnectionTrades,
  normalizeOptionDetails,
  normalizeProductType,
  normalizeTradeSide,
  normalizeTradeStatus,
  validateTradeTimestamps,
} = require('./trade.normalization');
const {
  deleteTradeById,
  findTradeById,
  insertTrade,
  queryUserTrades,
  toggleBreakevenDay,
  updateTradeFields,
  upsertJournalEntry,
  upsertMarketDetails,
  upsertOptionDetails,
  upsertTradeCalculation,
  upsertTradeExecutions,
} = require('./trade.repository');

async function getOwnedConnection(userId, value, database = pool) {
  if (!UUID_PATTERN.test(String(value || ''))) return null;
  const result = await database.query(`
    SELECT connection.id, broker.slug AS "brokerSlug"
    FROM broker_connections.user_broker_connections connection
    JOIN trading_catalog.broker_integrations integration ON integration.id = connection.integration_id
    JOIN trading_catalog.brokers broker ON broker.id = integration.broker_id
    WHERE connection.user_id = $1 AND connection.id = $2`,
    [userId, value]
  );
  return result.rows[0] || null;
}

function parseAttachments(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isAllowedImage(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 12) return false;
  return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    || (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    || (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP');
}

function removeTempFile(file) {
  if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
}

async function listTrades(userId, { source = null, fields = null, page = null, limit = null } = {}, database = pool) {
  const result = await queryUserTrades(database, userId, source ? [source] : null, { page, limit });
  const rows = Array.isArray(result) ? result : (result.rows || []);
  const fieldsFilter = fields ? new Set(String(fields).split(',').map((f) => f.trim()).filter(Boolean)) : null;
  const normalized = rows.map((row) => buildNormalizedTradeResponse(row, fieldsFilter));
  if (limit !== null && limit !== undefined) {
    const lim = Math.max(1, Math.min(100, Number(limit) || 25));
    const p = Math.max(1, Number(page) || 1);
    const total = result.totalCount !== undefined ? result.totalCount : normalized.length;
    return {
      trades: normalized,
      total,
      page: p,
      limit: lim,
      totalPages: Math.max(1, Math.ceil(total / lim)),
    };
  }
  return normalized;
}

async function getSingleTrade(userId, uniqueId, database = pool) {
  const row = await findTradeById(database, uniqueId, userId);
  return row ? buildNormalizedTradeResponse(row) : null;
}

async function createManualTrade(userId, body, database = pool) {
  const connection = await getOwnedConnection(userId, body.broker_connection_id, database);
  if (!connection) throw new Error('Invalid broker account');

  const symbol = trimString(body.symbol, { max: 64 });
  const uniqueId = trimString(body.unique_id, { max: 120 });
  const side = normalizeTradeSide(firstValue(body, 'trade_type', 'side'));
  const entryAt = body.entry_timestamp ? new Date(body.entry_timestamp).toISOString() : null;
  const exitAt = body.exit_timestamp ? new Date(body.exit_timestamp).toISOString() : null;

  if (!symbol) throw new Error('Invalid symbol');
  if (!uniqueId) throw new Error('Invalid unique_id');
  if (!side || !entryAt) throw new Error('Invalid trade type or entry timestamp');
  validateTradeTimestamps({ entryAt, exitAt });

  const quantity = finiteNumber(body.quantity, { min: 0.0000001 });
  const entryPrice = finiteNumber(firstValue(body, 'entry_price', 'price'), { min: 0.0000001 });
  let exitPrice = exitAt ? finiteNumber(body.exit_price, { min: 0 }) : null;
  if (!quantity || !entryPrice) throw new Error('Quantity and entry price must be greater than zero');
  if (exitAt && exitPrice === null) throw new Error('Exit price is required for closed trades');

  let productType = normalizeProductType(body.product_type);
  let instrument = null;
  let calculation = null;
  let defaults = {};

  if (body.instrument_id || ['forex_cfd', 'forex', 'cfd'].includes(productType)) {
    instrument = await getInstrument(symbol);
    if (!instrument || (body.instrument_id && String(body.instrument_id) !== String(instrument.id))) {
      throw new Error('Select an active instrument from the registry');
    }
    productType = normalizeProductType(instrument.productType);
    defaults = { contractSize: instrument.contractSize, pnlMultiplier: instrument.contractSize };
  }

  const brokerOptionDetails = productType === 'option' ? parseOptionContractSymbol(connection.brokerSlug, symbol) : null;
  const normalizedSymbol = brokerOptionDetails ? brokerOptionDetails.symbol : symbol;

  if (productType) {
    calculation = calculateTradePnl({
      productType,
      side,
      quantity,
      quantityUnit: body.quantity_unit,
      entryPrice,
      exitPrice: body.exit_price,
      entryTime: entryAt,
      exitTime: exitAt,
      productDetails: productType === 'option' ? {
        ...(body.option_details || {}),
        ...(brokerOptionDetails || {}),
        closeType: body.status === 'expired' ? 'expired' : 'before_expiry',
        entryPremium: entryPrice,
        exitPremium: body.exit_price,
      } : (firstValue(body, 'market_details', 'product_details') || {}),
      charges: body.charges,
      actualNetPnl: body.actual_net_pnl,
      brokerReportedNetPnl: body.broker_reported_net_pnl,
      pnlCurrency: body.pnl_currency,
    }, { defaults });
    if (exitAt) exitPrice = calculation.calculationInputs.exitPrice ?? exitPrice;
  }

  let optionDetails = null;
  if (productType === 'option') {
    optionDetails = normalizeOptionDetails({
      ...(body.option_details || {}),
      ...(brokerOptionDetails || {}),
      underlyingSymbol: brokerOptionDetails?.underlyingSymbol || body.option_details?.underlyingSymbol || normalizedSymbol,
      entryPremium: entryPrice,
      exitPremium: exitPrice,
      expirationOutcome: body.option_details?.expirationOutcome || (body.status === 'expired' ? 'expired_worthless' : null),
    });
  }

  const status = normalizeTradeStatus(body.status, { exitAt, expirationOutcome: optionDetails?.expirationOutcome });
  const grossPnl = calculation?.grossPnl ?? (exitAt && exitPrice !== null ? (side === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice) * quantity : null);
  const netPnl = exitAt ? (calculation?.finalPnl ?? (firstValue(body, 'net_pnl', 'pnl') ?? grossPnl)) : null;
  const totalCharges = calculation?.totalCharges ?? (finiteNumber(body.total_charges, { min: 0 }) || 0);

  const inserted = await insertTrade(database, {
    unique_id: uniqueId,
    user_id: userId,
    symbol: normalizedSymbol,
    side,
    quantity,
    quantity_unit: body.quantity_unit || null,
    entry_price: entryPrice,
    exit_price: exitPrice,
    entry_timestamp: entryAt,
    exit_timestamp: exitAt,
    gross_pnl: grossPnl,
    net_pnl: netPnl,
    total_charges: totalCharges,
    charges: calculation ? { total: calculation.charges } : (body.charges || null),
    pnl_currency: body.pnl_currency || 'USD',
    currency: firstValue(body, 'currency', 'pnl_currency') || 'USD',
    percent_change: finiteNumber(body.percent_change) ?? null,
    stop_loss: finiteNumber(body.stop_loss, { min: 0 }) ?? null,
    take_profit: finiteNumber(body.take_profit, { min: 0 }) ?? null,
    strategy: trimString(body.strategy, { max: 120 }) || null,
    notes: trimString(body.notes, { max: 5000 }) || null,
    attachments: Array.isArray(body.attachments) ? JSON.stringify(body.attachments) : (body.attachments || '[]'),
    status,
    close_reason: body.close_reason || null,
    product_type: productType,
    category: body.category || instrument?.category || null,
    instrument_id: instrument?.id || body.instrument_id || null,
    broker_connection_id: connection.id,
    source: 'manual',
  });

  if (optionDetails) await upsertOptionDetails(database, inserted.id, optionDetails);
  const marketInput = firstValue(body, 'market_details', 'product_details');
  if (marketInput && Object.keys(marketInput).length) await upsertMarketDetails(database, inserted.id, productType, marketInput);
  if (calculation) await upsertTradeCalculation(database, inserted.id, calculation);
  if (Array.isArray(body.executions) && body.executions.length) await upsertTradeExecutions(database, inserted.id, body.executions);

  if (['mistakes', 'custom_tags', 'execution_score', 'review_summary'].some((key) => Boolean(body[key]))) {
    await upsertJournalEntry(database, userId, inserted.id, {
      mistakes: body.mistakes,
      customTags: body.custom_tags,
      executionScore: body.execution_score,
      reviewSummary: body.review_summary,
    });
  }

  const createdFull = await findTradeById(database, uniqueId, userId);
  return buildNormalizedTradeResponse(createdFull || inserted);
}

async function createBulkTrades(userId, connectionId, rawTrades, database = pool) {
  const connection = await getOwnedConnection(userId, connectionId, database);
  if (!connection) throw new Error('Invalid broker account');
  const mapped = await mapConnectionTrades(userId, connection.id, rawTrades, database);
  if (!mapped || !mapped.length) throw new Error('This file does not match the selected broker schema');

  let successCount = 0;
  for (const trade of mapped) {
    try {
      const entryAt = trade.entry_timestamp ? new Date(trade.entry_timestamp).toISOString() : null;
      const exitAt = trade.exit_timestamp ? new Date(trade.exit_timestamp).toISOString() : null;
      if (!trade.symbol || !trade.unique_id || !trade.side || !entryAt) continue;

      const inserted = await insertTrade(database, {
        unique_id: trade.unique_id,
        user_id: userId,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity || 1,
        quantity_unit: trade.quantity_unit || null,
        entry_price: trade.entry_price || 0,
        exit_price: trade.exit_price || null,
        entry_timestamp: entryAt,
        exit_timestamp: exitAt,
        gross_pnl: trade.gross_pnl || null,
        net_pnl: trade.net_pnl || null,
        total_charges: trade.total_charges || 0,
        charges: trade.charges || null,
        pnl_currency: trade.pnl_currency || 'USD',
        currency: firstValue(trade, 'currency', 'pnl_currency') || 'USD',
        percent_change: trade.percent_change || null,
        stop_loss: trade.stop_loss || null,
        take_profit: trade.take_profit || null,
        strategy: trade.strategy || null,
        notes: trade.notes || null,
        attachments: '[]',
        status: trade.status || (exitAt ? 'closed' : 'open'),
        close_reason: trade.close_reason || null,
        product_type: trade.product_type || null,
        category: trade.category || null,
        instrument_id: null,
        broker_connection_id: connection.id,
        source: 'csv_upload',
      });
      if (Array.isArray(trade.executions) && trade.executions.length) {
        await upsertTradeExecutions(database, inserted.id, trade.executions);
      }
      successCount++;
    } catch {}
  }
  return { success: true, count: successCount, total: mapped.length };
}

async function updateTrade(userId, uniqueId, payload, database = pool) {
  const existing = await findTradeById(database, uniqueId, userId);
  if (!existing) throw new Error('Trade not found');

  const updates = [];
  const values = [];
  const pushField = (column, val) => {
    values.push(val);
    updates.push(`${column} = $${values.length}`);
  };

  if (payload.notes !== undefined) pushField('notes', trimString(payload.notes, { max: 5000 }));
  if (payload.strategy !== undefined) pushField('strategy', trimString(payload.strategy, { max: 120 }));
  if (payload.stop_loss !== undefined) pushField('stop_loss', finiteNumber(payload.stop_loss, { min: 0 }));
  if (payload.take_profit !== undefined) pushField('take_profit', finiteNumber(payload.take_profit, { min: 0 }));
  if (payload.percent_change !== undefined) pushField('percent_change', finiteNumber(payload.percent_change));

  if (updates.length) await updateTradeFields(database, uniqueId, userId, updates, values);

  if (payload.mistakes !== undefined || payload.custom_tags !== undefined || payload.execution_score !== undefined || payload.review_summary !== undefined) {
    await upsertJournalEntry(database, userId, existing.id, {
      mistakes: payload.mistakes,
      customTags: payload.custom_tags,
      executionScore: payload.execution_score,
      reviewSummary: payload.review_summary,
    });
  }

  const updatedFull = await findTradeById(database, uniqueId, userId);
  return buildNormalizedTradeResponse(updatedFull);
}

async function deleteTrade(userId, uniqueId, database = pool) {
  return deleteTradeById(database, uniqueId, userId);
}

async function uploadAttachment(userId, uniqueId, file, database = pool) {
  if (!file) throw new Error('No file uploaded');
  if (!isAllowedImage(file.path)) {
    removeTempFile(file);
    throw new Error('Invalid image file');
  }
  const trade = await findTradeById(database, uniqueId, userId);
  if (!trade) {
    removeTempFile(file);
    throw new Error('Trade not found');
  }

  const uploaded = await cloudinary.uploader.upload(file.path, {
    folder: `trading-app/user_${userId}`,
    public_id: `trade_${uniqueId}_${Date.now()}`,
    overwrite: false,
  });
  removeTempFile(file);

  const attachments = [...parseAttachments(trade.attachments), uploaded.secure_url];
  await database.query(`UPDATE trading.trades SET attachments = $1::jsonb WHERE (unique_id = $2 OR CAST(id AS TEXT) = $2) AND user_id = $3`,
    [JSON.stringify(attachments), uniqueId, userId]
  );
  return { screenshotUrl: uploaded.secure_url, screenshots: attachments };
}

async function deleteAttachment(userId, uniqueId, screenshotUrl, database = pool) {
  const trade = await findTradeById(database, uniqueId, userId);
  if (!trade) throw new Error('Trade not found');
  const current = parseAttachments(trade.attachments);
  const updated = current.filter((url) => url !== screenshotUrl);
  await database.query(`UPDATE trading.trades SET attachments = $1::jsonb WHERE (unique_id = $2 OR CAST(id AS TEXT) = $2) AND user_id = $3`,
    [JSON.stringify(updated), uniqueId, userId]
  );
  return { screenshots: updated };
}

async function getJournalNote(userId, uniqueId, database = pool) {
  const trade = await findTradeById(database, uniqueId, userId);
  if (!trade) throw new Error('Trade not found');
  const result = await database.query(`SELECT notes FROM trading.journal_entries WHERE user_id = $1 AND trade_id = $2 LIMIT 1`, [userId, trade.id]);
  return result.rows[0]?.notes || EMPTY_DOC;
}

async function updateJournalNote(userId, uniqueId, notes, database = pool) {
  const trade = await findTradeById(database, uniqueId, userId);
  if (!trade) throw new Error('Trade not found');
  const sanitized = sanitizeJournalContent(notes);
  await database.query(`
    INSERT INTO trading.journal_entries (user_id, trade_id, notes, created_at, updated_at)
    VALUES ($1, $2, $3::jsonb, NOW(), NOW())
    ON CONFLICT (user_id, trade_id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = NOW()`,
    [userId, trade.id, JSON.stringify(sanitized)]
  );
  return sanitized;
}
module.exports = {
  createBulkTrades,
  createManualTrade,
  deleteAttachment,
  deleteTrade,
  getJournalNote,
  getSingleTrade,
  listTrades,
  toggleBreakevenDay: (userId, date, isBreakeven, database = pool) => toggleBreakevenDay(database, userId, date, isBreakeven),
  updateJournalNote,
  updateTrade,
  uploadAttachment,
};
