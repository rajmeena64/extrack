import axios from "axios";
import { API_URL } from "./constants";

// =====================
// Axios Instance
// =====================
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

if (import.meta.env.DEV) {
  api.interceptors.request.use((config) => {
    config.metadata = { startTime: performance.now() };
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      const startedAt = response.config?.metadata?.startTime;
      if (typeof startedAt === "number") {
        console.info(
          "[api]",
          response.config.method?.toUpperCase(),
          response.config.url,
          `${Math.round(performance.now() - startedAt)}ms`
        );
      }
      return response;
    },
    (error) => {
      const startedAt = error.config?.metadata?.startTime;
      if (typeof startedAt === "number") {
        console.info(
          "[api]",
          error.config.method?.toUpperCase(),
          error.config.url,
          `${Math.round(performance.now() - startedAt)}ms`,
          "failed"
        );
      }
      return Promise.reject(error);
    }
  );
}

// =====================
// Refresh control
// =====================
let isRefreshing = false;
let refreshSubscribers = [];
let isForceLoggingOut = false;

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

const notifyLogout = () => {
  window.dispatchEvent(new Event("auth:logout"));
};

// =====================
// FULL FORCE LOGOUT FUNCTION
// =====================
const forceLogout = async () => {
  if (isForceLoggingOut) {
    notifyLogout();
    return;
  }

  isForceLoggingOut = true;

  try {
    await api.post("/logout");
  } catch {
    // Ignore logout cleanup failures and continue clearing local auth state.
  } finally {
    [
      "authUser",
      "darkMode",
      "tradeMode",
      "dashboardRowOrder",
      "trades_visible_fields",
      "extrack:userSettings",
    ].forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
    notifyLogout();
    isForceLoggingOut = false;
  }
};

// =====================
// RESPONSE INTERCEPTOR
// =====================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || "");
    const isRefreshRequest = requestUrl.includes("/refresh-token");
    const isLogoutRequest = requestUrl.includes("/logout");
    const isLogout = error.response?.data?.logout;
    const isUnauthorized =
      error.response?.data?.expired ||
      error.response?.status === 401;

    if (isRefreshRequest || isLogoutRequest) {
      if (isLogout || isUnauthorized) {
        await forceLogout();
      }

      return Promise.reject(error);
    }

    // If access token is missing/expired/invalid, try the refresh token once.
    if (isUnauthorized && !originalRequest?._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        await axios.post(
          `${API_URL}/api/refresh-token`,
          {},
          { withCredentials: true }
        );

        onRefreshed();

        return api(originalRequest);
      } catch (refreshError) {
        await forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (isLogout) {
      await forceLogout();
    }

    return Promise.reject(error);
  }
);

export default api;
