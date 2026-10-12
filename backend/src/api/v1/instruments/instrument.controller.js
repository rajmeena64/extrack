const instrumentRegistry = require('../../../domains/instruments/instrument.registry');
const AppError = require('../../../core/errors/AppError');

const instrumentController = {
  async list(req, res, next) {
    try {
      const { category, assetClass, productType, search, limit } = req.query;
      const instruments = (search || category || assetClass || productType)
        ? await instrumentRegistry.list({ category, assetClass, productType, search, limit: limit ? Number(limit) : 2000 })
        : await instrumentRegistry.getAllInstruments();
      res.json({ success: true, instruments });
    } catch (err) { next(err); }
  },

  async getBySymbol(req, res, next) {
    try {
      const instrument = await instrumentRegistry.getInstrument(req.params.symbol);
      if (!instrument) throw AppError.notFound('Instrument not found');
      res.json({ success: true, instrument });
    } catch (err) { next(err); }
  }
};

module.exports = instrumentController;
