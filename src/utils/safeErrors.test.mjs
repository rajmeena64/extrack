import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHART_ERROR_MESSAGE,
  LIVE_FEED_ERROR_MESSAGE,
  getUserSafeError,
} from './safeErrors.js';

test('maps backend safe codes to approved user messages', () => {
  const message = getUserSafeError({
    response: {
      status: 503,
      data: { code: 'LIVE_FEED_UNAVAILABLE', error: 'cTrader token failed' },
    },
  });

  assert.equal(message, LIVE_FEED_ERROR_MESSAGE);
});

test('does not display provider or database details from backend response text', () => {
  const message = getUserSafeError({
    response: {
      status: 400,
      data: { error: 'ClickHouse query failed for MT5 candles' },
    },
  }, CHART_ERROR_MESSAGE);

  assert.equal(message, CHART_ERROR_MESSAGE);
});

test('maps request timeout to safe timeout copy', () => {
  assert.equal(
    getUserSafeError({ code: 'ECONNABORTED' }),
    'Request timed out. Please try again.'
  );
});

test('uses fallback instead of raw Error.message', () => {
  assert.equal(
    getUserSafeError(new Error('SQL password token leaked'), 'Unable to load chart data right now.'),
    'Unable to load chart data right now.'
  );
});
