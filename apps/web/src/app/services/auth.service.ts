import type { LoginDtoIn, LoginDtoOut } from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type SessionUser = { userId: string; email: string };

export const authService = {
  async login(input: LoginDtoIn) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return handleResponse<LoginDtoOut>(res);
  },

  async logout() {
    const res = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<{ success: true }>(res);
  },

  async me() {
    const res = await fetch(`${API_URL}/auth/me`, { credentials: "include" });
    return handleResponse<SessionUser>(res);
  },

  googleUrl: `${API_URL}/auth/google`,
};
