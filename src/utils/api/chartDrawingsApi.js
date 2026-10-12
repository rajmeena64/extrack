import api from '@/utils/common/serve';

export const chartDrawingsApi = {
  getDrawings: (symbol) => api.get(`/chart-drawings/${encodeURIComponent(symbol)}`).then((res) => res.data),
  saveDrawings: (symbol, state, flush = false) => api.post(`/chart-drawings/${encodeURIComponent(symbol)}${flush ? '?flush=true' : ''}`, { state }).then((res) => res.data),
  deleteDrawings: (symbol) => api.delete(`/chart-drawings/${encodeURIComponent(symbol)}`).then((res) => res.data),
};

export default chartDrawingsApi;
