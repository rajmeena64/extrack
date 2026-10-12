const express = require('express');
const upload = require('../../infra/cache/upload');
const { authCheck } = require('../auth/controller');
const { createRateLimiter } = require('../../core/rateLimiter');
const { listBrokers } = require('../../brokers/brokerService');
const {
  createBulkTrades,
  createManualTrade,
  deleteAttachment,
  deleteTrade,
  getJournalNote,
  getSingleTrade,
  listTrades,
  toggleBreakevenDay,
  updateJournalNote,
  updateTrade,
  uploadAttachment,
} = require('./trade.service');

const router = express.Router();

const tradeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.TRADE_RATE_LIMIT_MAX || 120),
  keyGenerator: (req) => req.ip,
  message: 'Too many trade requests. Please slow down.',
});

router.get('/manual-brokers', authCheck, async (_req, res) => {
  try {
    res.json({ success: true, brokers: await listBrokers() });
  } catch {
    res.status(503).json({ success: false, error: 'Broker registry is unavailable' });
  }
});

router.get(['/trades', '/user-trades/:userid?'], authCheck, async (req, res, next) => {
  try {
    const result = await listTrades(req.userId, {
      source: req.query.source,
      fields: req.query.fields,
      page: req.query.page,
      limit: req.query.limit,
    });
    if (Array.isArray(result)) {
      res.json({ success: true, trades: result, count: result.length });
    } else {
      res.json({ success: true, ...result, count: result.trades.length });
    }
  } catch (err) {
    next(err);
  }
});

router.get(['/trades/:unique_id', '/get-trade/:unique_id'], authCheck, async (req, res, next) => {
  try {
    const trade = await getSingleTrade(req.userId, req.params.unique_id);
    if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });
    res.json({ success: true, trade });
  } catch (err) {
    next(err);
  }
});

router.post(['/trades', '/save-trade'], authCheck, tradeRateLimiter, async (req, res, next) => {
  try {
    const trade = await createManualTrade(req.userId, req.body);
    res.status(201).json({ success: true, message: 'Trade saved successfully!', trade });
  } catch (err) {
    next(err);
  }
});

router.post('/trades/bulk', authCheck, tradeRateLimiter, async (req, res, next) => {
  try {
    const { trades, broker_connection_id } = req.body;
    if (!Array.isArray(trades) || !trades.length) return res.status(400).json({ success: false, error: 'Invalid trades array' });
    const result = await createBulkTrades(req.userId, broker_connection_id, trades);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.patch(['/trades/:unique_id', '/update-trade'], authCheck, async (req, res, next) => {
  try {
    const uniqueId = req.params.unique_id || req.body?.unique_id || req.body?.uniqueId;
    if (!uniqueId) return res.status(400).json({ success: false, error: 'Unique ID is required' });
    const trade = await updateTrade(req.userId, uniqueId, req.body);
    res.json({ success: true, message: 'Trade updated successfully', trade });
  } catch (err) {
    next(err);
  }
});

router.delete(['/trades/:unique_id', '/api-trades/:id'], authCheck, async (req, res, next) => {
  try {
    const uniqueId = req.params.unique_id || req.params.id || req.body?.unique_id || req.body?.id;
    if (!uniqueId) return res.status(400).json({ success: false, error: 'Trade ID is required' });
    const deleted = await deleteTrade(req.userId, uniqueId);
    if (!deleted) return res.status(404).json({ success: false, error: 'Trade not found' });
    res.json({ success: true, message: 'Trade deleted successfully', deleted });
  } catch (err) {
    next(err);
  }
});

router.post(['/trades/:uniqueId/attachments', '/upload-screenshot'], authCheck, upload.single('screenshot'), async (req, res, next) => {
  try {
    const uniqueId = req.params.uniqueId || req.body?.unique_id || req.body?.uniqueId;
    if (!uniqueId) return res.status(400).json({ success: false, error: 'Unique ID is required' });
    const result = await uploadAttachment(req.userId, uniqueId, req.file);
    res.json({ success: true, message: 'Screenshot uploaded successfully', ...result });
  } catch (err) {
    next(err);
  }
});

router.delete(['/trades/:uniqueId/attachments', '/delete-screenshot'], authCheck, async (req, res, next) => {
  try {
    const uniqueId = req.params.uniqueId || req.body?.unique_id || req.body?.uniqueId;
    const screenshotUrl = req.body?.screenshotUrl || req.body?.screenshot_url || req.body?.url;
    if (!uniqueId || !screenshotUrl) return res.status(400).json({ success: false, error: 'Unique ID and screenshotUrl required' });
    const result = await deleteAttachment(req.userId, uniqueId, screenshotUrl);
    res.json({ success: true, message: 'Screenshot deleted successfully', ...result });
  } catch (err) {
    next(err);
  }
});

router.patch('/trades/breakeven-day', authCheck, async (req, res, next) => {
  try {
    const { date, is_breakeven } = req.body;
    if (!date) return res.status(400).json({ success: false, error: 'Date is required' });
    const result = await toggleBreakevenDay(req.userId, date, Boolean(is_breakeven));
    res.json({ success: true, entry: result });
  } catch (err) {
    next(err);
  }
});

router.get('/notes/trades/:uniqueId', authCheck, async (req, res, next) => {
  try {
    const notes = await getJournalNote(req.userId, req.params.uniqueId);
    res.json({ success: true, notes });
  } catch (err) {
    next(err);
  }
});

router.put('/notes/trades/:uniqueId', authCheck, async (req, res, next) => {
  try {
    const notes = await updateJournalNote(req.userId, req.params.uniqueId, req.body?.notes);
    res.json({ success: true, notes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
