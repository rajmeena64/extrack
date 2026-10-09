import api from '@/utils/common/serve';

export const marketApi = {
  getInstruments: (params) => api.get('/instruments', { params }).then((res) => res.data),
  getCandles: (params) => api.get('/market-chart/candles', { params }).then((res) => res.data),
  getWatchlistQuotes: (params) => api.get('/market-chart/watchlist-quotes', { params }).then((res) => res.data),
  getDatafeedCandles: (params) => api.get('/datafeed/candles', { params }).then((res) => res.data),
};

export default marketApi;
