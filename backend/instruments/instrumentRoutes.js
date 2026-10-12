const express = require('express');
const { getAllInstruments, getInstrument, list } = require('./instrumentRegistry');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, assetClass, productType, search, limit } = req.query;
    const instruments = (search || category || assetClass || productType) ? await list({ category, assetClass, productType, search, limit: limit ? Number(limit) : 2000 }) : await getAllInstruments();
    return res.json({ success: true, instruments });
  } catch {
    return res.status(503).json({ success: false, error: 'INSTRUMENT_REGISTRY_UNAVAILABLE' });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const instrument = await getInstrument(req.params.symbol);
    if (!instrument) return res.status(404).json({ success: false, error: 'Instrument not found' });
    return res.json({ success: true, instrument });
  } catch {
    return res.status(503).json({ success: false, error: 'INSTRUMENT_REGISTRY_UNAVAILABLE' });
  }
});

module.exports = router;
