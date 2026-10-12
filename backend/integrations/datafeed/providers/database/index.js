const tinybirdService = require('./tinybird.service');

module.exports = {
  fetchCandles: tinybirdService.fetchCandles,
};
