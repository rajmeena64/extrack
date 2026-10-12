const express = require('express');
const connectionController = require('./connection.controller');
const registry = require('../../../integrations/brokers/registry');
const validate = require('../../middleware/validate.middleware');
const { createConnectionSchema, updateConnectionSchema } = require('../../../domains/brokers');

const router = express.Router();

registry.mountAllRoutes(router);

router.get('/', connectionController.listConnections);
router.get('/:id', connectionController.getConnection);
router.post('/', validate({ body: createConnectionSchema }), connectionController.createConnection);
router.patch('/:id', validate({ body: updateConnectionSchema }), connectionController.updateConnection);
router.delete('/:id', connectionController.deleteConnection);
router.post('/:id/connect', connectionController.dispatchConnect);
router.post('/:id/sync', connectionController.dispatchSync);

module.exports = router;
