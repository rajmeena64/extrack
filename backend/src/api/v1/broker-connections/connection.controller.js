const { brokerService } = require('../../../domains/brokers');
const registry = require('../../../integrations/brokers/registry');

const connectionController = {
  async listConnections(req, res, next) {
    try {
      const data = await brokerService.listUserConnections(req.userId);
      res.json({ success: true, connections: data.connections, balances: data.balances });
    } catch (err) { next(err); }
  },

  async getConnection(req, res, next) {
    try {
      const connection = await brokerService.getUserConnection(req.params.id, req.userId);
      res.json({ success: true, connection });
    } catch (err) { next(err); }
  },

  async createConnection(req, res, next) {
    try {
      const connection = await brokerService.createUserConnection(req.userId, req.body);
      res.status(201).json({ success: true, connection });
    } catch (err) { next(err); }
  },

  async updateConnection(req, res, next) {
    try {
      const connection = await brokerService.updateUserConnection(req.userId, req.params.id, req.body);
      res.json({ success: true, connection });
    } catch (err) { next(err); }
  },

  async deleteConnection(req, res, next) {
    try {
      const result = await brokerService.deleteUserConnection(req.userId, req.params.id);
      res.json({ success: true, id: result.id });
    } catch (err) { next(err); }
  },

  async dispatchConnect(req, res, next) {
    try {
      const connection = await brokerService.getUserConnection(req.params.id, req.userId);
      return registry.dispatchConnect(req, res, connection);
    } catch (err) { next(err); }
  },

  async dispatchSync(req, res, next) {
    try {
      const connection = await brokerService.getUserConnection(req.params.id, req.userId);
      return registry.dispatchSync(req, res, connection);
    } catch (err) { next(err); }
  }
};

module.exports = connectionController;
