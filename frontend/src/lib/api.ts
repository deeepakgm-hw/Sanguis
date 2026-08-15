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

// Prevent concurrent 401 responses from triggering multiple
// refresh-token rotations. All requests share the same refresh
// Promise until the new access token is received.
let refreshPromise: Promise<string> | null = null;
// Retry authenticated requests after silently refreshing the
// access token. The refresh endpoint itself is never retried.
api.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest =
      error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

    // Only handle 401 responses.
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Never retry the refresh endpoint itself.
    if (originalRequest.url?.includes("/auth/refresh")) {
      useAuthStore.getState().clear();
      return Promise.reject(new Error("SESSION_EXPIRED"));
    }

    // Don't retry the same request more than once.
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      // Reuse one refresh request if another refresh is already running.
      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then((response) => {
            const newToken = response.data?.data?.accessToken;

            if (!newToken || typeof newToken !== "string") {
              throw new Error(
                "Refresh response did not contain accessToken"
              );
            }

            useAuthStore.getState().setAccessToken(newToken);

            return newToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;

      // Retry the original request with the new access token.
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      useAuthStore.getState().clear();

      return Promise.reject(new Error("SESSION_EXPIRED"));
    }
  }
);


    
  

