import type {
  Coordinates,
  CreateShareDtoIn,
  CreateShareDtoOut,
  CurrentShareDtoOut,
  ShareViewDtoOut,
} from "@urbanflow/app-front-back-lib";
import { handleEmptyResponse, handleResponse } from "@/app/services/lib/http";

export type { CreateShareDtoIn, CurrentShareDtoOut, ShareViewDtoOut };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const JSON_HEADERS = { "Content-Type": "application/json" };

export const SHARE_CONSENT_REQUIRED = "SHARE_CONSENT_REQUIRED";

export const sharesService = {
  async create(source: CreateShareDtoIn["source"]) {
    const response = await fetch(`${API_URL}/shares`, {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify({ source }),
    });
    return handleResponse<CreateShareDtoOut>(response);
  },

  async getCurrent() {
    const response = await fetch(`${API_URL}/shares/current`, { credentials: "include" });
    return handleResponse<CurrentShareDtoOut>(response);
  },

  async recordPosition(position: Coordinates) {
    const response = await fetch(`${API_URL}/shares/current/position`, {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify(position),
    });
    return handleEmptyResponse(response);
  },

  async confirmArrival() {
    const response = await fetch(`${API_URL}/shares/current/arrival`, { method: "POST", credentials: "include" });
    return handleEmptyResponse(response);
  },

  async stop() {
    const response = await fetch(`${API_URL}/shares/current`, { method: "DELETE", credentials: "include" });
    return handleEmptyResponse(response);
  },

  /** Sans cookie : le proche n'a pas de compte, le jeton seul ouvre la vue. */
  async view(token: string) {
    const response = await fetch(`${API_URL}/shares/view`, { headers: { "Share-Token": token } });
    return handleResponse<ShareViewDtoOut>(response);
  },
};
