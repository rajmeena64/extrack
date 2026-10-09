import api from '@/utils/common/serve';

export const authApi = {
  getMe: () => api.get('/auth/me').then((res) => res.data),
  login: (credentials) => api.post('/auth/login', credentials).then((res) => res.data),
  signup: (payload) => api.post('/auth/signup', payload).then((res) => res.data),
  logout: () => api.post('/auth/logout').then((res) => res.data),
  refreshToken: () => api.post('/auth/refresh-token').then((res) => res.data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`).then((res) => res.data),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }).then((res) => res.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((res) => res.data),
  verifyResetOtp: (payload) => api.post('/auth/verify-reset-otp', payload).then((res) => res.data),
  resetPassword: (payload) => api.post('/auth/reset-password', payload).then((res) => res.data),
  changePassword: (payload) => api.post('/auth/change-password', payload).then((res) => res.data),
  updateProfile: (payload) => api.post('/auth/profile', payload).then((res) => res.data),
  updateProfileLegacy: (payload) => api.post('/auth/update-profile', payload).then((res) => res.data),
  deleteAccount: (password) => api.delete('/auth/delete-account', { data: { password } }).then((res) => res.data),
  getWsToken: () => api.get('/ws-token').then((res) => res.data),
  getHealth: () => api.get('/health').then((res) => res.data),
};

export default authApi;
