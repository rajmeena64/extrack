const routes = require('./routes');
const repository = require('./repository');
const { fetchAngelOneTradeBook } = require('./trades');

module.exports = {
  slug: 'angel-one',
  name: 'Angel One',
  routes,
  getBalances(userId) {
    return [];
  },
  async reloadLiveSync() {
    return Promise.resolve();
  },
  async beforeDelete(userId, connection) {
    return Promise.resolve();
  },
};
