import type {
  CreateUserDtoIn,
  CreateUserDtoOut,
  GetUserProfileDtoOut,
  UpdatePreferencesDtoIn,
  UpdatePreferencesDtoOut,
  FavoriteAddress,
  CreateFavoriteAddressDtoIn,
  CreateFavoriteAddressDtoOut,
  ListFavoriteAddressesDtoOut,
  DeleteFavoriteAddressDtoOut,
  UpdateAccountDtoIn,
  UpdateAccountDtoOut,
  ChangePasswordDtoIn,
  ChangePasswordDtoOut,
  DeleteAccountDtoOut,
  ExportUserDataDtoOut,
} from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

export type {
  CreateUserDtoIn,
  CreateUserDtoOut,
  GetUserProfileDtoOut,
  UpdatePreferencesDtoIn,
  UpdatePreferencesDtoOut,
  FavoriteAddress,
  CreateFavoriteAddressDtoIn,
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

  async listAddresses() {
    const res = await fetch(`${API_URL}/users/me/addresses`, { credentials: "include" });
    return handleResponse<ListFavoriteAddressesDtoOut>(res);
  },

  async createAddress(input: CreateFavoriteAddressDtoIn) {
    const res = await fetch(`${API_URL}/users/me/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return handleResponse<CreateFavoriteAddressDtoOut>(res);
  },

  async deleteAddress(id: string) {
    const res = await fetch(`${API_URL}/users/me/addresses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<DeleteFavoriteAddressDtoOut>(res);
  },

  async updateAccount(input: UpdateAccountDtoIn) {
    const res = await fetch(`${API_URL}/users/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return handleResponse<UpdateAccountDtoOut>(res);
  },

  async changePassword(input: ChangePasswordDtoIn) {
    const res = await fetch(`${API_URL}/users/me/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    });
    return handleResponse<ChangePasswordDtoOut>(res);
  },

  async deleteAccount() {
    const res = await fetch(`${API_URL}/users/me`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<DeleteAccountDtoOut>(res);
  },

  async exportData() {
    const res = await fetch(`${API_URL}/users/me/export`, { credentials: "include" });
    return handleResponse<ExportUserDataDtoOut>(res);
  },
};
