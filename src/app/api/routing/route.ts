import { NextResponse } from "next/server";
import { PlanRouteDtoInSchema, planRouteUseCase } from "@/backend/transport";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = PlanRouteDtoInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const routes = await planRouteUseCase(parsed.data);
    return NextResponse.json({ routes });
  } catch (e) {
    const message = e instanceof Error ? e.message : "INTERNAL_ERROR";
    const status = message.includes("ORS_RATE_LIMIT") ? 429 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
