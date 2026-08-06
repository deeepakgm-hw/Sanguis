import { create } from "zustand";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "moderator";
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  clear: () => void;
}

// Deliberately in-memory (no persist middleware). Session survives a
// refresh via GET /auth/me + POST /auth/refresh on app boot (see
// AuthProvider), not via localStorage — keeping the token out of any
// storage an XSS payload could read.
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null }),
}));
