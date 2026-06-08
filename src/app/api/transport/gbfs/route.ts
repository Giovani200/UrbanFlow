import { NextResponse } from "next/server";
import { fetchStationsUseCase } from "@/backend/transport";

export async function GET() {
  try {
    const result = await fetchStationsUseCase();
    return NextResponse.json(
      result,
      { headers: { "Cache-Control": "public, s-maxage=60" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "GBFS_ERROR";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
