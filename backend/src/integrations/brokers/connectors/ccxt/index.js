const routes = require('./routes');
const liveSync = require('./liveSync');
const { isSupported } = require('./client');
module.exports = {
  slug: 'ccxt',
  name: 'CCXT Universal',
  routes,
  supports: isSupported,
  getBalances: (userId) => liveSync.getBalances(userId),
  startLiveSync: (wss) => liveSync.startLiveSync(wss),
  stopLiveSync: () => liveSync.stopLiveSync(),
  reloadLiveSync: () => liveSync.reloadLiveSync(),
  sendSnapshot: (userId) => liveSync.sendSnapshot(userId),
};
