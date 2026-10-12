const routes = require('./routes');
const repository = require('./repository');

module.exports = {
  slug: 'metatrader',
  name: 'MetaTrader 5',
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
