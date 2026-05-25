import { prisma } from "@/backend/lib/prisma";
import type { GetUserProfileDtoOut } from "./get-user-profile.dto";

export async function getUserProfileUseCase(
    userId: string
): Promise<GetUserProfileDtoOut> {
    const userProfile = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            name: true,
            mobilityProfile: {
                select: {
                    weightCarbon: true,
                    weightTime: true,
                    weightCost: true,
                    wheelchairAccess: true,
                    avoidStairs: true,
                    preferredModes: true,
                },
            },
        },
    });

    return userProfile;
}