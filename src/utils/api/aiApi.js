import api from '@/utils/common/serve';

export const aiApi = {
  chat: (payload) => api.post('/ai-trade-chat', payload).then((res) => res.data),
  analyzeTrade: (payload) => api.post('/ai-trade-analysis', payload).then((res) => res.data),
};

export default aiApi;
