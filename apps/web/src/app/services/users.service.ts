import type { CreateUserDtoIn, CreateUserDtoOut } from "@/shared/dtos/users/create-user.dto";
import type { GetUserProfileDtoOut } from "@/shared/dtos/users/get-user-profile.dto";
import type { UpdateMobilityProfileDtoIn, UpdateMobilityProfileDtoOut } from "@/shared/dtos/users/update-user-profile.dto";

export type { CreateUserDtoIn, CreateUserDtoOut, GetUserProfileDtoOut, UpdateMobilityProfileDtoIn, UpdateMobilityProfileDtoOut };

import { handleResponse } from "@/app/services/lib/http";

export const usersService = {
  async register(input: CreateUserDtoIn) {
    const res = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<CreateUserDtoOut>(res);
  },

  async getProfile() {
    const res = await fetch("/api/users/profile");
    return handleResponse<GetUserProfileDtoOut>(res);
  },

  async updateProfile(input: UpdateMobilityProfileDtoIn) {
    const res = await fetch("/api/users/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return handleResponse<UpdateMobilityProfileDtoOut>(res);
  },
};
