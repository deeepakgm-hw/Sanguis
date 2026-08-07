import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1",
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

// Attach the in-memory access token to every request. Deliberately
// NOT stored in localStorage: an XSS payload can read localStorage,
// but it can't read a variable that only lives in the Zustand store's
// closure/module scope for this tab's session.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<(token: string) => void> = [];

/**
 * On a 401, silently hit /auth/refresh (which relies on the httpOnly
 * cookie) to get a new access token, retry the original request once,
 * and queue any other requests that failed concurrently instead of
 * firing N parallel refresh calls (which would race the token-rotation
 * "reuse detection" on the backend and log the user out).
 */
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || originalRequest._retry || originalRequest.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        pendingQueue.push((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await api.post("/auth/refresh");
      const newToken = data.data.accessToken as string;
      useAuthStore.getState().setAccessToken(newToken);

      pendingQueue.forEach((cb) => cb(newToken));
      pendingQueue = [];

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clear();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
