

import axios from "axios";
import { API_URL } from "./constants";

// =====================
// Axios Instance
// =====================
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// =====================
// Refresh control
// =====================
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// =====================
//  FULL FORCE LOGOUT FUNCTION
// =====================
const forceLogout = async () => {
  try {
    await api.post("/logout"); // backend cleanup (optional safe call)
  } catch (e) {}

  //  CLEAR EVERYTHING
  localStorage.clear();
  sessionStorage.clear();

  //  remove auth header
  delete api.defaults.headers.common.Authorization;

  //  notify app
  window.dispatchEvent(new Event("auth:logout"));

  //  redirect
  window.location.href = "/dashboard";
};

// =====================
// REQUEST INTERCEPTOR
// =====================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =====================
// RESPONSE INTERCEPTOR
// =====================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isLogout = error.response?.data?.logout;
    const isExpired =
      error.response?.data?.expired ||
      error.response?.status === 401;

    //  FORCE LOGOUT CASE (MOST IMPORTANT)
    if (isLogout) {
      await forceLogout();
      return Promise.reject(error);
    }

    //  TOKEN EXPIRED HANDLING
    if (isExpired && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_URL}/api/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newToken = res.data.accessToken;

        localStorage.setItem("accessToken", newToken);
        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;

        onRefreshed(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        // console.log("❌ Refresh failed → FORCE LOGOUT");

        await forceLogout();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
