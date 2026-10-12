const tradeService = require('../../../domains/trading/trade.service');

const tradeController = {
  async list(req, res, next) {
    try {
      const result = await tradeService.listTrades(req.userId, req.query);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async getSingle(req, res, next) {
    try {
      const trade = await tradeService.getTrade(req.userId, req.params.uniqueId);
      res.json({ success: true, trade });
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const trade = await tradeService.createTrade(req.userId, req.body);
      res.status(201).json({ success: true, message: 'Trade saved successfully!', trade });
    } catch (err) { next(err); }
  },

  async createBulk(req, res, next) {
    try {
      const { brokerConnectionId, trades } = req.body;
      const result = await tradeService.bulkCreateTrades(req.userId, brokerConnectionId, trades);
      res.status(201).json({ success: true, ...result });
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const trade = await tradeService.updateTrade(req.userId, req.params.uniqueId, req.body);
      res.json({ success: true, message: 'Trade updated successfully', trade });
    } catch (err) { next(err); }
  },

  async delete(req, res, next) {
    try {
      const deleted = await tradeService.deleteTrade(req.userId, req.params.uniqueId);
      res.json({ success: true, message: 'Trade deleted successfully', deleted });
    } catch (err) { next(err); }
  },

  async uploadAttachment(req, res, next) {
    try {
      const result = await tradeService.uploadAttachment(req.userId, req.params.uniqueId, req.file);
      res.json({ success: true, message: 'Screenshot uploaded successfully', ...result });
    } catch (err) { next(err); }
  },

  async deleteAttachment(req, res, next) {
    try {
      const { screenshotUrl } = req.body;
      const result = await tradeService.deleteAttachment(req.userId, req.params.uniqueId, screenshotUrl);
      res.json({ success: true, message: 'Screenshot deleted successfully', ...result });
    } catch (err) { next(err); }
  },

  async toggleBreakevenDay(req, res, next) {
    try {
      const { date, isBreakeven } = req.body;
      const entry = await tradeService.toggleBreakevenDay(req.userId, date, isBreakeven);
      res.json({ success: true, entry });
    } catch (err) { next(err); }
  },

  async getNotes(req, res, next) {
    try {
      const notes = await tradeService.getNotes(req.userId, req.params.uniqueId);
      res.json({ success: true, notes });
    } catch (err) { next(err); }
  },

  async updateNotes(req, res, next) {
    try {
      const notes = await tradeService.updateNotes(req.userId, req.params.uniqueId, req.body.notes);
      res.json({ success: true, notes });
    } catch (err) { next(err); }
  }
};

module.exports = tradeController;
