import type { CarbonSummaryDtoOut, Period } from "@urbanflow/app-front-back-lib";
import { handleResponse } from "@/app/services/lib/http";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const carbonService = {
  async getSummary(period: Period) {
    const response = await fetch(`${API_URL}/carbon/summary?period=${period}`, {
      credentials: "include",
    });
    return handleResponse<CarbonSummaryDtoOut>(response);
  },
};