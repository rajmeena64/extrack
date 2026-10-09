import api from '@/utils/common/serve';

export const analyticsApi = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }).then((res) => res.data),
};

export default analyticsApi;
