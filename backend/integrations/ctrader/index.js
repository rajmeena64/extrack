const entrackMicro = require('../datafeed/providers/entrackmicro');
const { registerCtraderRoutes } = require('./routes');

module.exports = {
  feedClient: entrackMicro,
  feedStreamClient: entrackMicro,
  feedKeyService: entrackMicro,
  registerCtraderRoutes,
};
