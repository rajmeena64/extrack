import api from '@/utils/common/serve';

export const tradeApi = {
  getAll: (params) => api.get('/trades', { params }).then((res) => res.data),
  getById: (uniqueId, params) => api.get(`/trades/${encodeURIComponent(uniqueId)}`, { params }).then((res) => res.data),
  create: (payload) => api.post('/trades', payload).then((res) => res.data),
  update: (uniqueId, payload) => api.patch(`/trades/${encodeURIComponent(uniqueId)}`, { ...payload, uniqueId }).then((res) => res.data),
  delete: (uniqueId) => api.delete(`/trades/${encodeURIComponent(uniqueId)}`).then((res) => res.data),
  uploadAttachment: (uniqueId, formData) => api.post(`/trades/${encodeURIComponent(uniqueId)}/attachments`, formData).then((res) => res.data),
  deleteAttachment: (uniqueId, screenshotUrl) =>
    api.delete(`/trades/${encodeURIComponent(uniqueId)}/attachments`, { data: { uniqueId, screenshotUrl } }).then((res) => res.data),
  toggleBreakevenDay: (payload) => api.patch('/trades/breakeven-day', payload).then((res) => res.data),
  getJournalNote: (uniqueId) => api.get(`/trades/${encodeURIComponent(uniqueId)}`).then((res) => ({ success: true, notes: res.data?.trade?.notes })),
  updateJournalNote: (uniqueId, notes) => api.patch(`/trades/${encodeURIComponent(uniqueId)}`, { notes, uniqueId }).then((res) => res.data),
  getManualBrokers: () => api.get('/manual-brokers').then((res) => res.data),
};

export default tradeApi;
