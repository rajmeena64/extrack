const crypto = require('crypto');
const fs = require('fs');
const tradeRepository = require('./trade.repository');
const { calculatePnl, calculatePercentChange } = require('./trade.calculator');
const {
  normalizeTradeSide,
  normalizeTradeStatus,
  normalizeProductType,
  validateTimestamps,
  buildTradeResponse
} = require('./trade.normalization');
const instrumentRegistry = require('../instruments/instrument.registry');
const storage = require('../../integrations/storage');
const AppError = require('../../core/errors/AppError');

const tradeService = {
  async listTrades(userId, options = {}) {
    const result = await tradeRepository.queryUserTrades(userId, options);
    return {
      trades: result.trades.map(buildTradeResponse),
      totalCount: result.totalCount
    };
  },

  async getTrade(userId, uniqueId) {
    const row = await tradeRepository.findTradeById(uniqueId, userId);
    if (!row) throw AppError.notFound('Trade not found');
    return buildTradeResponse(row);
  },

  async createTrade(userId, data) {
    const symbol = String(data.symbol).trim().toUpperCase();
    const instrument = await instrumentRegistry.getInstrument(symbol);

    const side = normalizeTradeSide(data.side);
    const { entryTimestamp, exitTimestamp } = validateTimestamps(data.entryTimestamp, data.exitTimestamp);
    const status = normalizeTradeStatus(data.status, exitTimestamp);
    const productType = normalizeProductType(data.productType || instrument?.productType);
    const category = data.category || instrument?.category || null;
    const multiplier = instrument?.contractSize ? Number(instrument.contractSize) : 1;

    let grossPnl = null;
    let netPnl = null;
    let percentChange = null;

    if (data.exitPrice) {
      grossPnl = calculatePnl(side, data.entryPrice, data.exitPrice, data.quantity, multiplier);
      const charges = data.totalCharges || 0;
      netPnl = Number((grossPnl - charges).toFixed(4));
      percentChange = calculatePercentChange(data.entryPrice, data.exitPrice, side);
    }

    const tradeRecord = {
      uniqueId: data.uniqueId || crypto.randomUUID(),
      userId,
      brokerConnectionId: data.brokerConnectionId || null,
      symbol,
      side,
      status,
      quantity: data.quantity,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice || null,
      entryTimestamp,
      exitTimestamp,
      grossPnl,
      netPnl,
      totalCharges: data.totalCharges || 0,
      pnlCurrency: data.pnlCurrency || instrument?.profitCurrency || null,
      stopLoss: data.stopLoss || null,
      takeProfit: data.takeProfit || null,
      percentChange,
      productType,
      category,
      strategy: data.strategy || null,
      notes: data.notes || null,
      attachments: [],
      source: 'manual'
    };

    const created = await tradeRepository.insertTrade(tradeRecord);
    return buildTradeResponse(created);
  },

  async bulkCreateTrades(userId, connectionId, tradesList) {
    const createdTrades = [];
    for (const tradeData of tradesList) {
      const created = await this.createTrade(userId, {
        ...tradeData,
        brokerConnectionId: connectionId || tradeData.brokerConnectionId
      });
      createdTrades.push(created);
    }
    return { count: createdTrades.length, trades: createdTrades };
  },

  async updateTrade(userId, uniqueId, data) {
    const existing = await tradeRepository.findTradeById(uniqueId, userId);
    if (!existing) throw AppError.notFound('Trade not found');

    const entryPrice = data.entryPrice !== undefined ? data.entryPrice : Number(existing.entry_price);
    const exitPrice = data.exitPrice !== undefined ? data.exitPrice : (existing.exit_price !== null ? Number(existing.exit_price) : null);
    const quantity = data.quantity !== undefined ? data.quantity : Number(existing.quantity);
    const totalCharges = data.totalCharges !== undefined ? data.totalCharges : Number(existing.total_charges || 0);

    const updates = {};
    if (data.entryPrice !== undefined) updates.entry_price = data.entryPrice;
    if (data.exitPrice !== undefined) updates.exit_price = data.exitPrice;
    if (data.quantity !== undefined) updates.quantity = data.quantity;
    if (data.stopLoss !== undefined) updates.stop_loss = data.stopLoss;
    if (data.takeProfit !== undefined) updates.take_profit = data.takeProfit;
    if (data.strategy !== undefined) updates.strategy = data.strategy;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.totalCharges !== undefined) updates.total_charges = data.totalCharges;

    if (exitPrice !== null) {
      const pnl = calculatePnl(existing.side, entryPrice, exitPrice, quantity);
      updates.gross_pnl = pnl;
      updates.net_pnl = Number((pnl - totalCharges).toFixed(4));
      updates.percent_change = calculatePercentChange(entryPrice, exitPrice, existing.side);
      updates.status = 'closed';
    }

    const updated = await tradeRepository.updateTrade(uniqueId, userId, updates);
    return buildTradeResponse(updated);
  },

  async deleteTrade(userId, uniqueId) {
    const deleted = await tradeRepository.deleteTrade(uniqueId, userId);
    if (!deleted) throw AppError.notFound('Trade not found');
    return { uniqueId: deleted.unique_id, symbol: deleted.symbol };
  },

  async uploadAttachment(userId, uniqueId, file) {
    if (!file) throw AppError.badRequest('No image file provided');
    const existing = await tradeRepository.findTradeById(uniqueId, userId);
    if (!existing) throw AppError.notFound('Trade not found');

    let uploadResult;
    try {
      uploadResult = await storage.cloudinary.upload(file.path, { folder: `trades/${userId}` });
    } finally {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    const attachments = Array.isArray(existing.attachments)
      ? existing.attachments
      : JSON.parse(existing.attachments || '[]');

    attachments.push(uploadResult.url);
    await tradeRepository.updateAttachments(uniqueId, userId, attachments);
    return { attachments };
  },

  async deleteAttachment(userId, uniqueId, attachmentUrl) {
    const existing = await tradeRepository.findTradeById(uniqueId, userId);
    if (!existing) throw AppError.notFound('Trade not found');

    let attachments = Array.isArray(existing.attachments)
      ? existing.attachments
      : JSON.parse(existing.attachments || '[]');

    attachments = attachments.filter((url) => url !== attachmentUrl);
    await tradeRepository.updateAttachments(uniqueId, userId, attachments);
    return { attachments };
  },

  async toggleBreakevenDay(userId, date, isBreakeven) {
    return tradeRepository.toggleBreakevenDay(userId, date, isBreakeven);
  },

  async getNotes(userId, uniqueId) {
    return tradeRepository.getNotes(uniqueId, userId);
  },

  async updateNotes(userId, uniqueId, notes) {
    return tradeRepository.updateNotes(uniqueId, userId, notes);
  }
};

module.exports = tradeService;
