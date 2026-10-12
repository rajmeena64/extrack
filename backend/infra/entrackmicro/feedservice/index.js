const client = require('./client');
const auth = require('./auth');
const routes = require('./routes');

module.exports = {
  ...client,
  ...auth,
  routes,
};
