const { AsyncLocalStorage } = require('async_hooks');
const storage = new AsyncLocalStorage();

function runWithContext(context, fn) {
  return storage.run(context, fn);
}

function getContext() {
  return storage.getStore() || {};
}

function getTraceId() {
  return getContext().traceId || null;
}

module.exports = {
  runWithContext,
  getContext,
  getTraceId
};
