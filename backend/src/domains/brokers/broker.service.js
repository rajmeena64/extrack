const brokerRepository = require('./broker.repository');
const registry = require('../../integrations/brokers/registry');
const AppError = require('../../core/errors/AppError');

const brokerService = {
  async listBrokers(options) {
    return brokerRepository.listBrokers(options);
  },

  async getBroker(id) {
    const broker = await brokerRepository.findBrokerById(id);
    if (!broker) throw AppError.notFound('Broker not found', 'BROKER_NOT_FOUND');
    return broker;
  },

  async listBrokerIntegrations(brokerId) {
    await this.getBroker(brokerId);
    return brokerRepository.listBrokerIntegrations(brokerId);
  },

  async listUserConnections(userId) {
    const connections = await brokerRepository.listUserConnections(userId);
    const liveBalances = registry.getAllLiveBalances(userId);
    return { connections, balances: liveBalances };
  },

  async getUserConnection(connectionId, userId) {
    const connection = await brokerRepository.findUserConnectionById(connectionId, userId);
    if (!connection) throw AppError.notFound('Connection not found', 'CONNECTION_NOT_FOUND');
    return connection;
  },

  async createUserConnection(userId, data) {
    return brokerRepository.createUserConnection(userId, data);
  },

  async updateUserConnection(userId, connectionId, data) {
    await this.getUserConnection(connectionId, userId);
    return brokerRepository.updateUserConnection(userId, connectionId, data);
  },

  async deleteUserConnection(userId, connectionId) {
    const connection = await this.getUserConnection(connectionId, userId);
    await registry.executeBeforeDelete(userId, connection);
    const deleted = await brokerRepository.deleteUserConnection(userId, connectionId);
    registry.reloadAllLiveSync().catch(() => {});
    return deleted;
  }
};

module.exports = brokerService;
