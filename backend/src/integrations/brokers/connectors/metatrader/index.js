const routes = require('./routes');

module.exports = {
  slug: 'metatrader',
  name: 'MetaTrader 5',
  routes,
  getBalances() { return []; },
  async reloadLiveSync() { return Promise.resolve(); },
  async beforeDelete() { return Promise.resolve(); }
};
