import { auth } from "@/backend/lib/auth";
import { getUserProfileUseCase,
    updateMobilityProfileUseCase } from "@/backend/users";
import { UpdateMobilityProfileDtoInSchema } from "@/backend/users/update-mobility-profile/update-mobility-profile.dto";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error:
            "Unauthorized" }, { status: 401 });

    const profile = await getUserProfileUseCase(session.user.id);
    return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed =
        UpdateMobilityProfileDtoInSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const profile = await
        updateMobilityProfileUseCase(session.user.id, parsed.data);
    return NextResponse.json(profile);
}