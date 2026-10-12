const routes = require('./routes');
const liveSync = require('./liveSync');
const { ensureBinanceAccountFingerprint } = require('./service');

module.exports = {
  slug: 'binance',
  name: 'Binance',
  routes,
  getBalances(userId) {
    return liveSync.getBalances(userId);
  },
  async reloadLiveSync() {
    return liveSync.reload();
  },
  startLiveSync(wss) {
    liveSync.start(wss);
  },
  stopLiveSync() {
    liveSync.stop();
  },
  sendSnapshot(userId) {
    liveSync.sendSnapshot(userId);
  },
  async beforeDelete(userId, connection) {
    if (!connection.externalAccountId) {
      await ensureBinanceAccountFingerprint(userId, connection.id);
    }
  },
};
