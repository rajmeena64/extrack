const express = require('express');
const brokerController = require('./broker.controller');
const validate = require('../../middleware/validate.middleware');
const { listBrokersQuerySchema } = require('../../../domains/brokers');

const router = express.Router();

router.get('/', validate({ query: listBrokersQuerySchema }), brokerController.listBrokers);
router.get('/:id', brokerController.getBroker);
router.get('/:id/integrations', brokerController.listIntegrations);

module.exports = router;
