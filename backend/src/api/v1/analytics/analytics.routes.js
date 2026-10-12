const express = require('express');
const analyticsController = require('./analytics.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboard);

module.exports = router;
