import api from '@/utils/common/serve';

export const brokerApi = {
  getConnections: () => api.get('/broker-connections').then((res) => res.data),
  createConnection: (payload) => api.post('/broker-connections', payload).then((res) => res.data),
  deleteConnection: (connectionId) => api.delete(`/broker-connections/${encodeURIComponent(connectionId)}`).then((res) => res.data),
  getConnectionMapping: (connectionId, tradeMethod) => api.get(`/broker-connections/${encodeURIComponent(connectionId)}/mapping`, { params: { tradeMethod } }).then((res) => res.data),
  setConnectionIntegration: (connectionId, integrationId) => api.post(`/broker-connections/${encodeURIComponent(connectionId)}/integration`, { integrationId }).then((res) => res.data),
  getBrokers: (params) => api.get('/brokers', { params }).then((res) => res.data),
  getIntegrations: (brokerId) => api.get(`/brokers/${encodeURIComponent(brokerId)}/integrations`).then((res) => res.data),
  connect: (connectionId, payload) => api.post(`/broker-connections/${encodeURIComponent(connectionId)}/connect`, payload).then((res) => res.data),
  sync: (connectionId, payload) => api.post(`/broker-connections/${encodeURIComponent(connectionId)}/sync`, payload).then((res) => res.data),
};

export default brokerApi;
