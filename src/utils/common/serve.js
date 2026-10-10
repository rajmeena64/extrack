import axios from "axios";
import { API_URL } from "./constants";
import { clearClientStorage } from "../storage/clientStorage";

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
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

let isRefreshing = false;
let refreshSubscribers = [];
let isForceLoggingOut = false;

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (err) => {
  refreshSubscribers.forEach((cb) => cb(err));
  refreshSubscribers = [];
};

const notifyLogout = () => {
  window.dispatchEvent(new Event("auth:logout"));
};

const forceLogout = async () => {
  if (isForceLoggingOut) {
    notifyLogout();
    return;
  }
  isForceLoggingOut = true;
  try {
    api.post("/auth/logout").catch(() => null);
  } finally {
    clearClientStorage();
    notifyLogout();
    isForceLoggingOut = false;
  }
};

const refreshAuthToken = async () => {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      subscribeTokenRefresh((err) => (err ? reject(err) : resolve()));
    });
  }
  isRefreshing = true;
  try {
    await axios.post(
      `${API_URL}/api/v1/auth/refresh-token`,
      {},
      { withCredentials: true }
    );
    onRefreshed(null);
  } catch (refreshError) {
    onRefreshed(refreshError);
    clearClientStorage();
    notifyLogout();
    throw refreshError;
  } finally {
    isRefreshing = false;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = String(originalRequest?.url || "");
    const isRefreshRequest = requestUrl.includes("/refresh-token");
    const isLogoutRequest = requestUrl.includes("/logout");
    const isMeRequest = requestUrl.includes("/auth/me");
    const isLogout = error.response?.data?.logout;
    const isAuthRequired = error.response?.data?.code === "AUTH_REQUIRED";
    const isUnauthorized =
      error.response?.data?.expired ||
      error.response?.status === 401;

    if (isRefreshRequest || isLogoutRequest) {
      if (isLogout || isUnauthorized) {
        clearClientStorage();
        notifyLogout();
      }
      return Promise.reject(error);
    }

    if (isMeRequest && (isAuthRequired || !localStorage.getItem("authUser"))) {
      clearClientStorage();
      return Promise.reject(error);
    }

    if (isUnauthorized && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        await refreshAuthToken();
        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    if (isLogout) {
      await forceLogout();
    }

    return Promise.reject(error);
  }
);

export default api;
