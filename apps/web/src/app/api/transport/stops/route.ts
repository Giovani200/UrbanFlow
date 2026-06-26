import { NextResponse } from "next/server";
import { FetchStopsDtoInSchema, fetchStopsUseCase } from "@/backend/transport";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const parsed = FetchStopsDtoInSchema.safeParse({
      lat: parseFloat(searchParams.get("lat") ?? ""),
      lng: parseFloat(searchParams.get("lng") ?? ""),
      radius: parseInt(searchParams.get("radius") ?? "500", 10),
      wheelchairOnly: searchParams.get("wheelchair") === "true",
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const result = await fetchStopsUseCase(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "GTFS_ERROR";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
