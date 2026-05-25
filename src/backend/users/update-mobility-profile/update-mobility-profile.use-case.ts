import { prisma } from "@/backend/lib/prisma";
import type {
    UpdateMobilityProfileDtoIn,
    UpdateMobilityProfileDtoOut,
} from "./update-mobility-profile.dto";

export async function updateMobilityProfileUseCase(
    userId: string,
    data: UpdateMobilityProfileDtoIn
): Promise<UpdateMobilityProfileDtoOut> {
    const profile = await prisma.mobilityProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
        select: {
            weightCarbon: true,
            weightTime: true,
            weightCost: true,
            wheelchairAccess: true,
            avoidStairs: true,
            preferredModes: true,
        },
    });

    return profile;
}