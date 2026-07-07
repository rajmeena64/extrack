const express = require('express');
const {
  getAllInstruments,
  getInstrumentsByType,
  getInstrumentBySymbol,
  getInstrumentCacheStatus,
  searchInstruments,
} = require('./instrumentRegistry');
const { logInternalError, publicError } = require('../core/errors/safeErrors');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const instruments = type ? await getInstrumentsByType(type) : await getAllInstruments();

    return res.json(instruments);
  } catch (err) {
    logInternalError(req, err, 'instruments.list_failed');
    return publicError(res, {
      status: 503,
      code: 'MARKET_DATA_UNAVAILABLE',
      req,
    });
  }
});

router.get('/check', async (req, res) => {
  try {
    const instrument = await getInstrumentBySymbol(req.query.symbol);

    if (!instrument) {
      return res.json({ exists: false });
    }

    return res.json({
      exists: true,
      instrument,
    });
  } catch (err) {
    logInternalError(req, err, 'instruments.check_failed');
    return publicError(res, {
      status: 503,
      code: 'MARKET_DATA_UNAVAILABLE',
      req,
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    return res.json(await searchInstruments(req.query.q));
  } catch (err) {
    logInternalError(req, err, 'instruments.search_failed');
    return publicError(res, {
      status: 503,
      code: 'MARKET_DATA_UNAVAILABLE',
      req,
    });
  }
});

router.get('/status', (req, res) => {
  return res.json(getInstrumentCacheStatus());
});

module.exports = router;
