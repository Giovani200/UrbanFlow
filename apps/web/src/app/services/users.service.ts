import type {
  CreateUserDtoIn,
  CreateUserDtoOut,
  GetUserProfileDtoOut,
  UpdatePreferencesDtoIn,
  UpdatePreferencesDtoOut,
} from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

export type {
  CreateUserDtoIn,
  CreateUserDtoOut,
  GetUserProfileDtoOut,
  UpdatePreferencesDtoIn,
  UpdatePreferencesDtoOut,
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const usersService = {
  async register(input: CreateUserDtoIn) {
    const res = await fetch(`${API_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<CreateUserDtoOut>(res);
  },

  async getProfile() {
    const res = await fetch(`${API_URL}/users/me`, { credentials: "include" });
    return handleResponse<GetUserProfileDtoOut>(res);
  },

  async updateProfile(input: UpdatePreferencesDtoIn) {
    const res = await fetch(`${API_URL}/users/me/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return handleResponse<UpdatePreferencesDtoOut>(res);
  },
};
