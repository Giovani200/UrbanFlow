import bcrypt from "bcryptjs";
import { prisma } from "@/backend/lib/prisma";
import type { CreateUserDtoIn, CreateUserDtoOut } from "./create-user.dto";

export async function createUserUseCase(
    data: CreateUserDtoIn
): Promise<CreateUserDtoOut> {
    const existing = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true },
    });

    if (existing) {
        throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            passwordHash,
        },
        select: {
            id: true,
            email: true,
            name: true,
        },
    });
    return user;
}