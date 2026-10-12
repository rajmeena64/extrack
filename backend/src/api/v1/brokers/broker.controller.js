const { brokerService } = require('../../../domains/brokers');

const brokerController = {
  async listBrokers(req, res, next) {
    try {
      const brokers = await brokerService.listBrokers(req.query);
      res.json({ success: true, brokers });
    } catch (err) { next(err); }
  },

  async getBroker(req, res, next) {
    try {
      const broker = await brokerService.getBroker(req.params.id);
      res.json({ success: true, broker });
    } catch (err) { next(err); }
  },

  async listIntegrations(req, res, next) {
    try {
      const integrations = await brokerService.listBrokerIntegrations(req.params.id);
      res.json({ success: true, integrations });
    } catch (err) { next(err); }
  }
};

module.exports = brokerController;
