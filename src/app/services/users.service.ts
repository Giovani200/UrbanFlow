import type { CreateUserDtoIn, CreateUserDtoOut } from "@/backend/users/create-user/create-user.dto";
import type { GetUserProfileDtoOut } from "@/backend/users/get-user-profile/get-user-profile.dto";
import type { UpdateMobilityProfileDtoIn, UpdateMobilityProfileDtoOut } from "@/backend/users/update-mobility-profile/update-mobility-profile.dto";

type Result<T> = { isOk: true; data: T } | { isOk: false; error: string };

async function handleResponse<T>(res: Response): Promise<Result<T>> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { isOk: false, error: body?.error ?? "Erreur serveur" };
  }
  const data = (await res.json()) as T;
  return { isOk: true, data };
}

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
