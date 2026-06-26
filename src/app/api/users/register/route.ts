import { createUserUseCase } from "@/backend/users/use-cases/create-user.use-case";
import { CreateUserDtoInSchema } from "@/shared/dtos/users/create-user.dto";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const body = await req.json();
    const parsed = CreateUserDtoInSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error:
            parsed.error.flatten() }, { status: 400 });

    try {
        const user = await createUserUseCase(parsed.data);
        return NextResponse.json(user, { status: 201 });
    } catch (err) {
        if (err instanceof Error && err.message ===
            "EMAIL_ALREADY_EXISTS") {
            return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
            }
            return NextResponse.json({ error: "Erreur serveur" },
                { status: 500 });
        }
    }