const express = require('express');
const {
  getAllInstruments,
  getInstrumentsByType,
  getInstrumentBySymbol,
  searchInstruments,
} = require('./instrumentRegistry');

const router = express.Router();

router.get('/', (req, res) => {
  const { type } = req.query;
  const instruments = type ? getInstrumentsByType(type) : getAllInstruments();

  return res.json(instruments);
});

router.get('/check', (req, res) => {
  const instrument = getInstrumentBySymbol(req.query.symbol);

  if (!instrument) {
    return res.json({ exists: false });
  }

  return res.json({
    exists: true,
    instrument,
  });
});

router.get('/search', (req, res) => {
  return res.json(searchInstruments(req.query.q));
});

module.exports = router;
