const routes = require('./routes');
const liveSync = require('./liveSync');
module.exports = {
  slug: 'ctrader',
  name: 'cTrader',
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
};
