const express = require('express');
const instrumentController = require('./instrument.controller');

const router = express.Router();

router.get('/', instrumentController.list);
router.get('/:symbol', instrumentController.getBySymbol);

module.exports = router;
