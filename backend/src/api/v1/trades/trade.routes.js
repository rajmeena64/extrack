const express = require('express');
const tradeController = require('./trade.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const upload = require('../../middleware/upload.middleware');
const validate = require('../../middleware/validate.middleware');
const {
  createTradeSchema,
  bulkTradeSchema,
  updateTradeSchema,
  breakevenDaySchema,
  updateNotesSchema
} = require('../../../domains/trading/trade.schema');

const router = express.Router();

router.use(authMiddleware);

router.get('/', tradeController.list);
router.get('/:uniqueId', tradeController.getSingle);
router.post('/', validate({ body: createTradeSchema }), tradeController.create);
router.post('/bulk', validate({ body: bulkTradeSchema }), tradeController.createBulk);
router.patch('/breakeven-day', validate({ body: breakevenDaySchema }), tradeController.toggleBreakevenDay);
router.patch('/:uniqueId', validate({ body: updateTradeSchema }), tradeController.update);
router.delete('/:uniqueId', tradeController.delete);

router.post('/:uniqueId/attachments', upload.single('screenshot'), tradeController.uploadAttachment);
router.delete('/:uniqueId/attachments', tradeController.deleteAttachment);

router.get('/notes/:uniqueId', tradeController.getNotes);
router.put('/notes/:uniqueId', validate({ body: updateNotesSchema }), tradeController.updateNotes);

module.exports = router;
