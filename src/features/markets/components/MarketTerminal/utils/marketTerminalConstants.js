export const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];
export const DEFAULT_SYMBOL = 'EURUSD';
export const INITIAL_CANDLE_LIMIT = 1000;
export const HISTORY_CHUNK_LIMIT = 1000;
export const PAST_BUFFER_CHUNKS = 2;
export const CANDLE_CHUNK_CACHE_MS = 30 * 1000;
export const HISTORY_OUTLIER_DEVIATION = 0.4;
export const MAX_CHARTS = 8;

export const LAYOUTS = [
  { value: '1', label: '1 Chart', columns: 1, rows: 1, capacity: 1 },
  { value: '2v', label: '2 Vertical', columns: 2, rows: 1, capacity: 2 },
  { value: '2h', label: '2 Horizontal', columns: 1, rows: 2, capacity: 2 },
  { value: '3v', label: '3 Vertical', columns: 3, rows: 1, capacity: 3 },
  { value: '3h', label: '3 Horizontal', columns: 1, rows: 3, capacity: 3 },
  { value: '3', label: '3 Grid', columns: 2, rows: 2, capacity: 3 },
  { value: '4', label: '4 Grid', columns: 2, rows: 2, capacity: 4 },
  { value: '5', label: '5 Grid', columns: 3, rows: 2, capacity: 5 },
  { value: '6', label: '6 Grid', columns: 3, rows: 2, capacity: 6 },
];

export const TERMINAL_LAYOUT_STORAGE_KEY = 'entrack:marketTerminalLayout';
export const WATCHLIST_SYMBOLS_STORAGE_KEY = 'entrack:marketTerminalWatchlist';
export const ACTIVE_SYMBOL_STORAGE_KEY = 'entrack:marketTerminalActiveSymbol';
export const CHART_SYMBOL_DRAG_TYPE = 'application/x-entrack-symbol';

export const DEFAULT_WATCHLIST_SYMBOLS = [
  DEFAULT_SYMBOL,
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'USDCHF',
  'NZDUSD',
  'EURJPY',
  'GBPJPY',
  'XAUUSD',
  'XAGUSD',
  'BTCUSDT',
  'ETHUSDT',
];

export const DEFAULT_TERMINAL_LAYOUT = {
  watchlistWidth: 336,
  orderWidth: 286,
  bottomHeight: 200,
};

export const WATCHLIST_SECTION_ORDER = ['Forex & CFD', 'Crypto', 'Stocks & ETFs', 'Futures', 'Options', 'Bonds'];

export const WATCHLIST_PRIORITY = new Map([
  DEFAULT_SYMBOL,
  'GBPUSD',
  'USDJPY',
  'AUDUSD',
  'USDCAD',
  'USDCHF',
  'NZDUSD',
  'EURJPY',
  'GBPJPY',
  'XAUUSD',
  'XAGUSD',
  'BTCUSDT',
  'ETHUSDT',
].map((symbol, index) => [symbol, index]));
