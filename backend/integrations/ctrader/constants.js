const CTRADER_PERIODS = {
  M1: 1,
  M2: 2,
  M3: 3,
  M4: 4,
  M5: 5,
  M10: 6,
  M15: 7,
  M30: 8,
  H1: 9,
  H4: 10,
  H12: 11,
  D1: 12,
  W1: 13,
  MN1: 14,
};

const CTRADER_INTERVALS = {
  '1m': CTRADER_PERIODS.M1,
  '3m': CTRADER_PERIODS.M3,
  '5m': CTRADER_PERIODS.M5,
  '15m': CTRADER_PERIODS.M15,
  '30m': CTRADER_PERIODS.M30,
  '1h': CTRADER_PERIODS.H1,
  '4h': CTRADER_PERIODS.H4,
  '1d': CTRADER_PERIODS.D1,
  '1w': CTRADER_PERIODS.W1,
  '1M': CTRADER_PERIODS.MN1,
};

const RESPONSE_TYPE_NAMES = {
  2101: 'ProtoOAApplicationAuthRes',
  2103: 'ProtoOAAccountAuthRes',
  2115: 'ProtoOASymbolsListRes',
  2138: 'ProtoOAGetTrendbarsRes',
  2142: 'ProtoOAErrorRes',
  2146: 'ProtoOAGetTickDataRes',
};

const EXPECTED_RESPONSE_BY_REQUEST = {
  2100: 2101,
  2102: 2103,
  2114: 2115,
  2137: 2138,
  2145: 2146,
};

const REQUEST_PAYLOAD_TYPES = {
  51: 'ProtoHeartbeatEvent',
  2100: 'ProtoOAApplicationAuthReq',
  2102: 'ProtoOAAccountAuthReq',
  2114: 'ProtoOASymbolsListReq',
  2137: 'ProtoOAGetTrendbarsReq',
  2145: 'ProtoOAGetTickDataReq',
};

const ADMIN_ACCOUNT_TYPES = new Set(['admin', 'superadmin']);
const MAX_RECONNECT_ATTEMPTS = 5;
const PRICE_SCALE = 100000;

module.exports = {
  ADMIN_ACCOUNT_TYPES,
  CTRADER_INTERVALS,
  CTRADER_PERIODS,
  EXPECTED_RESPONSE_BY_REQUEST,
  MAX_RECONNECT_ATTEMPTS,
  PRICE_SCALE,
  REQUEST_PAYLOAD_TYPES,
  RESPONSE_TYPE_NAMES,
};
