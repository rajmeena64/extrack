import api from '@/utils/common/serve';

export const settingsApi = {
  getSettings: () => api.get('/settings').then((res) => res.data),
  saveSettings: (settings) => api.post('/settings', settings).then((res) => res.data),
};

export default settingsApi;
