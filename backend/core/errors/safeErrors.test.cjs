const test = require('node:test');
const assert = require('node:assert/strict');
const {
  publicError,
  redactValue,
  sanitizeError,
} = require('./safeErrors');

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('publicError returns only safe fields and messages for internal exceptions', () => {
  const req = {
    headers: { 'x-request-id': 'req-test-1' },
    originalUrl: '/api/ohlcv/chunk',
    method: 'GET',
  };
  const res = createResponse();

  publicError(res, {
    status: 503,
    code: 'MARKET_DATA_UNAVAILABLE',
    req,
  });

  assert.equal(res.statusCode, 503);
  assert.deepEqual(Object.keys(res.body).sort(), ['code', 'error', 'message', 'requestId', 'success'].sort());
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'MARKET_DATA_UNAVAILABLE');
  assert.equal(res.body.message, 'Unable to load market data right now.');
  assert.equal(res.body.error, 'Unable to load market data right now.');
  assert.equal(res.body.requestId, 'req-test-1');
});

test('redactValue removes secrets from nested log objects', () => {
  const redacted = redactValue('root', {
    password: 'secret-password',
    nested: {
      accessToken: 'secret-token',
      authorization: 'Bearer secret',
      harmless: 'visible',
    },
  });

  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.nested.accessToken, '[REDACTED]');
  assert.equal(redacted.nested.authorization, '[REDACTED]');
  assert.equal(redacted.nested.harmless, 'visible');
});

test('sanitizeError keeps internal detail for logs without exposing stack in production', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const sanitized = sanitizeError(Object.assign(new Error('ClickHouse query failed: token abc'), { code: 'DB_FAIL' }));
  process.env.NODE_ENV = previousNodeEnv;

  assert.equal(sanitized.message, 'ClickHouse query failed: token abc');
  assert.equal(sanitized.code, 'DB_FAIL');
  assert.equal(sanitized.stack, undefined);
});
