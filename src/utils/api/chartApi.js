import api from '@/utils/common/serve';

export const chartApi = {
  getSettings: () => api.get('/chart/settings').then((res) => res.data),
  saveSettings: (settings) => api.post('/chart/settings', { settings }).then((res) => res.data),
  getLayouts: () => api.get('/chart/layouts').then((res) => res.data),
  getLayout: (id) => api.get(`/chart/layouts/${encodeURIComponent(id)}`).then((res) => res.data),
  saveLayout: (layout) => api.post('/chart/layouts', layout).then((res) => res.data),
  deleteLayout: (id) => api.delete(`/chart/layouts/${encodeURIComponent(id)}`).then((res) => res.data),
  getDrawings: (symbol) => api.get(`/chart/drawings/${encodeURIComponent(symbol)}`).then((res) => res.data),
  saveDrawings: (symbol, state) => api.post(`/chart/drawings/${encodeURIComponent(symbol)}`, { state }).then((res) => res.data),
  deleteDrawings: (symbol) => api.delete(`/chart/drawings/${encodeURIComponent(symbol)}`).then((res) => res.data),
};

export default chartApi;
