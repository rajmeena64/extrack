class IFeedProvider {
  constructor(providerCode) {
    if (new.target === IFeedProvider) {
      throw new TypeError('Cannot construct IFeedProvider directly');
    }
    this.providerCode = providerCode;
  }

  async getCandles(symbol, timeframe, from, to) {
    throw new Error('getCandles not implemented');
  }

  async subscribe(symbol, callback) {
    throw new Error('subscribe not implemented');
  }

  async unsubscribe(symbol) {
    throw new Error('unsubscribe not implemented');
  }
}

module.exports = IFeedProvider;
