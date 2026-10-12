const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ version: 'v2', status: 'initialized' });
});

module.exports = router;
