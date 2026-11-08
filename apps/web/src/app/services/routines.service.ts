import type {
  Coordinates,
  ListRoutinesDtoOut,
  RoutineActionDtoOut,
  RoutineDtoOut,
  RoutineFields,
  RoutineTodayDtoOut,
} from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

export type { RoutineDtoOut, RoutineFields, RoutineTodayDtoOut };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const JSON_HEADERS = { "Content-Type": "application/json" };

export const routinesService = {
  async list() {
    const response = await fetch(`${API_URL}/routines`, { credentials: "include" });
    return handleResponse<ListRoutinesDtoOut>(response);
  },

  async create(fields: RoutineFields) {
    const response = await fetch(`${API_URL}/routines`, {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify(fields),
    });
    return handleResponse<RoutineDtoOut>(response);
  },

  async update(routineId: string, fields: RoutineFields) {
    const response = await fetch(`${API_URL}/routines/${routineId}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify(fields),
    });
    return handleResponse<RoutineDtoOut>(response);
  },

  async remove(routineId: string) {
    const response = await fetch(`${API_URL}/routines/${routineId}`, { method: "DELETE", credentials: "include" });
    return handleResponse<RoutineActionDtoOut>(response);
  },

  async getToday() {
    const response = await fetch(`${API_URL}/routines/today`, { credentials: "include" });
    return handleResponse<RoutineTodayDtoOut>(response);
  },

  async markNotTaken(routineId: string, position: Coordinates | null) {
    const response = await fetch(`${API_URL}/routines/${routineId}/today/not-taken`, {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify(position ? { position } : {}),
    });
    return handleResponse<RoutineActionDtoOut>(response);
  },

  async chooseAlternative(routineId: string, alternativeIndex: 0 | 1) {
    const response = await fetch(`${API_URL}/routines/${routineId}/today/choose`, {
      method: "POST",
      headers: JSON_HEADERS,
      credentials: "include",
      body: JSON.stringify({ alternativeIndex }),
    });
    return handleResponse<RoutineActionDtoOut>(response);
  },
};
