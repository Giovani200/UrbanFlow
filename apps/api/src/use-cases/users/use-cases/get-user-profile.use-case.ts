import { Injectable, NotFoundException } from "@nestjs/common";
import { z as zod } from "zod";
import {
    GetUserProfileDtoOut,
    GetUserProfileDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

// Commande back-only : le userId vient du JWT (injecté par le controller), jamais du client.
const GetUserProfileCommandSchema = zod.object({ userId: zod.string() });
type GetUserProfileCommand = zod.output<typeof GetUserProfileCommandSchema>;

@Injectable()
export class GetUserProfileUseCase extends AbstractUseCase<GetUserProfileCommand, GetUserProfileDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(GetUserProfileCommandSchema, GetUserProfileDtoOutSchema);
    }

    protected async executeUseCase(dataIn: GetUserProfileCommand): Promise<GetUserProfileDtoOut> {
        const user = await this.prisma.user.findUnique({
            where: { id: dataIn.userId },
            select: {
                id: true,
                email: true,
                name: true,
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

        // preferences = null tant que l'utilisateur n'a rien rempli (S7 sautable).
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            preferences: user.preferences ?? null,
        };
    }
}
