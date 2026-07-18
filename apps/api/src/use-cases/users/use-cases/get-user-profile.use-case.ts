import { Injectable, NotFoundException } from "@nestjs/common";
import { z as zod } from "zod";
import {
    GetUserProfileDtoOut,
    GetUserProfileDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractAuthenticatedUseCase } from "../../../shared/core/abstract.authenticated.use-case";
import type { AuthenticatedUser } from "../../../shared/auth/jwt.strategy";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class GetUserProfileUseCase extends AbstractAuthenticatedUseCase<void, GetUserProfileDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(zod.void(), GetUserProfileDtoOutSchema);
    }

    protected async executeUseCase(authenticatedUser: AuthenticatedUser): Promise<GetUserProfileDtoOut> {
        const user = await this.prisma.user.findUnique({
            where: { id: authenticatedUser.userId },
            select: {
                id: true,
                email: true,
                name: true,
                passwordHash: true,
                preferences: {
                    select: {
                        weightCarbon: true,
                        weightTime: true,
                        weightCost: true,
                        wheelchairAccess: true,
                        avoidStairs: true,
                        preferredModes: true,
                        monthlyGoalKg: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException("USER_NOT_FOUND");
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            hasPassword: user.passwordHash !== null,
            preferences: user.preferences ?? null,
        };
    }
}
