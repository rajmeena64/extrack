import tradeApi from './tradeApi';
import analyticsApi from './analyticsApi';
import authApi from './authApi';
import brokerApi from './brokerApi';
import marketApi from './marketApi';
import settingsApi from './settingsApi';
import aiApi from './aiApi';

export const API = {
  auth: authApi,
  trades: tradeApi,
  analytics: analyticsApi,
  brokers: brokerApi,
  market: marketApi,
  settings: settingsApi,
  ai: aiApi,
};

export { authApi, tradeApi, analyticsApi, brokerApi, marketApi, settingsApi, aiApi };
export default API;
