"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { type AuthUser, getSavedUser, login as apiLogin, logout as apiLogout } from "@/lib/api";

interface AuthContextValue {
  user: { username: string; role: string } | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on mount
    const saved = getSavedUser();
    if (saved) setUser(saved);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiLogin(username, password);
    setUser({ username: data.username, role: data.role });
    return data;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    // Clear the middleware cookie
    document.cookie = "giftiq_token=; path=/; max-age=0";
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
