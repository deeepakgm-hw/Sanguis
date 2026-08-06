"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

interface AuthContextValue {
  isBootstrapping: boolean;
}

const AuthContext = createContext<AuthContextValue>({ isBootstrapping: true });

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * On first load, the browser has the httpOnly refresh cookie but the
 * Zustand store (in-memory) is empty. We silently call /auth/refresh
 * to mint a fresh access token, then /auth/me to hydrate the user —
 * so a page reload doesn't force a re-login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    (async () => {
      try {
        const refreshRes = await api.post("/auth/refresh");
        setAccessToken(refreshRes.data.data.accessToken);

        const meRes = await api.get("/auth/me");
        setUser(meRes.data.data);
      } catch {
        // No valid session — user simply isn't logged in. Not an error state.
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, [setAccessToken, setUser]);

  return <AuthContext.Provider value={{ isBootstrapping }}>{children}</AuthContext.Provider>;
}
