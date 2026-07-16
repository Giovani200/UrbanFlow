import { Injectable } from "@nestjs/common";
import {
    UpdatePreferencesDtoIn,
    UpdatePreferencesDtoInSchema,
    UpdatePreferencesDtoOut,
    UpdatePreferencesDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class UpdatePreferencesUseCase extends AbstractAuthenticatedUseCase<
    UpdatePreferencesDtoIn,
    UpdatePreferencesDtoOut
> {
    constructor(private readonly prisma: PrismaService) {
        super(UpdatePreferencesDtoInSchema, UpdatePreferencesDtoOutSchema);
    }

    protected async executeUseCase(
        authenticatedUser: AuthenticatedUser,
        dataIn: UpdatePreferencesDtoIn,
    ): Promise<UpdatePreferencesDtoOut> {
        return this.prisma.preferences.upsert({
            where: { userId: authenticatedUser.userId },
            create: { userId: authenticatedUser.userId, ...dataIn },
            update: dataIn,
            select: {
                weightCarbon: true,
                weightTime: true,
                weightCost: true,
                wheelchairAccess: true,
                avoidStairs: true,
                preferredModes: true,
                monthlyGoalKg: true,
            },
        });
    }
}
