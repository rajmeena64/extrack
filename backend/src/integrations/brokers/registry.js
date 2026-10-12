const binanceConnector = require('./connectors/binance');
const ctraderConnector = require('./connectors/ctrader');
const angelOneConnector = require('./connectors/angel-one');
const metatraderConnector = require('./connectors/metatrader');
const ccxtConnector = require('./connectors/ccxt');
class BrokerRegistry {
  constructor() {
    this.connectors = new Map();
    this.register(binanceConnector);
    this.register(ctraderConnector);
    this.register(angelOneConnector);
    this.register(metatraderConnector);
    this.register(ccxtConnector);
  }
  register(connector) {
    if (!connector || !connector.slug) throw new Error('Connector must have a valid slug');
    this.connectors.set(connector.slug, connector);
  }
  getConnector(slug) {
    if (this.connectors.has(slug)) return this.connectors.get(slug);
    if (ccxtConnector.supports(slug)) return ccxtConnector;
    return null;
  }
  getAllConnectors() {
    return Array.from(this.connectors.values());
  }
  mountAllRoutes(router) {
    for (const connector of this.connectors.values()) {
      if (connector.routes) router.use(`/${connector.slug}`, connector.routes);
    }
  }
  getAllLiveBalances(userId) {
    const balances = [];
    for (const connector of this.connectors.values()) {
      if (typeof connector.getBalances === 'function') {
        const res = connector.getBalances(userId);
        if (Array.isArray(res)) balances.push(...res);
      }
    }
    return balances;
  }
  async reloadAllLiveSync() {
    const promises = [];
    for (const connector of this.connectors.values()) {
      if (typeof connector.reloadLiveSync === 'function') {
        promises.push(Promise.resolve(connector.reloadLiveSync()).catch(() => {}));
      }
    }
    await Promise.all(promises);
  }
  startAllLiveSync(wss) {
    for (const connector of this.connectors.values()) {
      if (typeof connector.startLiveSync === 'function') connector.startLiveSync(wss);
    }
  }
  stopAllLiveSync() {
    for (const connector of this.connectors.values()) {
      if (typeof connector.stopLiveSync === 'function') connector.stopLiveSync();
    }
  }
  sendAllSnapshots(userId) {
    for (const connector of this.connectors.values()) {
      if (typeof connector.sendSnapshot === 'function') connector.sendSnapshot(userId);
    }
  }
  async executeBeforeDelete(userId, connection) {
    if (!connection || !connection.brokerSlug) return;
    const connector = this.getConnector(connection.brokerSlug);
    if (connector && typeof connector.beforeDelete === 'function') {
      await connector.beforeDelete(userId, connection);
    }
  }
  dispatchConnect(req, res, connection) {
    const connector = this.getConnector(connection.brokerSlug);
    if (!connector || !connector.routes) return res.status(400).json({ success: false, error: 'Unsupported connector' });
    req.body = { ...req.body, connectionId: connection.id };
    req.query = { ...req.query, connectionId: connection.id };
    req.url = '/connect';
    return connector.routes(req, res);
  }
  dispatchSync(req, res, connection) {
    const connector = this.getConnector(connection.brokerSlug);
    if (!connector || !connector.routes) return res.status(400).json({ success: false, error: 'Unsupported connector' });
    req.body = { ...req.body, connectionId: connection.id };
    req.params = { ...req.params, id: connection.id };
    req.url = '/sync';
    return connector.routes(req, res);
  }
}
const registry = new BrokerRegistry();
module.exports = registry;
