import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import {
    UpdatePreferencesDtoInSchema,
    UpdatePreferencesDtoOut,
    UpdatePreferencesDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

// Commande back-only : préférences (toutes optionnelles) + userId injecté depuis le JWT.
const UpdatePreferencesCommandSchema = UpdatePreferencesDtoInSchema.extend({
    userId: zod.string(),
});
type UpdatePreferencesCommand = zod.output<typeof UpdatePreferencesCommandSchema>;

@Injectable()
export class UpdatePreferencesUseCase extends AbstractUseCase<
    UpdatePreferencesCommand,
    UpdatePreferencesDtoOut
> {
    constructor(private readonly prisma: PrismaService) {
        super(UpdatePreferencesCommandSchema, UpdatePreferencesDtoOutSchema);
    }

    protected async executeUseCase(dataIn: UpdatePreferencesCommand): Promise<UpdatePreferencesDtoOut> {
        const { userId, ...preferences } = dataIn;

        // Upsert paresseux : crée les préférences au 1er enregistrement (S7 ou paramètres), sinon met à jour.
        return this.prisma.preferences.upsert({
            where: { userId },
            create: { userId, ...preferences },
            update: preferences,
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
