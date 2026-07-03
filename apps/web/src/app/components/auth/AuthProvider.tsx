"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { LoginDtoIn } from "@urbanflow/app-front-back-lib";
import { authService, type SessionUser } from "@/app/services/auth.service";

type Status = "loading" | "authenticated" | "unauthenticated";

type LoginResult = { isOk: true } | { isOk: false; error: string };

interface AuthContextValue {
  user: SessionUser | null;
  status: Status;
  login: (input: LoginDtoIn) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    const res = await authService.me();
    if (res.isOk) {
      setUser(res.data);
      setStatus("authenticated");
    } else {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: LoginDtoIn): Promise<LoginResult> => {
      const res = await authService.login(input);
      if (!res.isOk) return { isOk: false, error: res.error };
      await refresh();
      return { isOk: true };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
