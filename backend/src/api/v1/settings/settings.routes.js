const express = require('express');
const settingsController = require('./settings.controller');
const authMiddleware = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', settingsController.get);
router.post('/', settingsController.update);
router.patch('/', settingsController.update);

module.exports = router;
