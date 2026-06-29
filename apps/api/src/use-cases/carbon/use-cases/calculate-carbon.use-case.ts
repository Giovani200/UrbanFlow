import { Injectable } from "@nestjs/common";
import {
    CalculateCarbonDtoIn,
    CalculateCarbonDtoInSchema,
    CalculateCarbonDtoOut,
    CalculateCarbonDtoOutSchema,
    TripMode,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { CARBON_FACTORS } from "../../../shared/constants";

@Injectable()
export class CalculateCarbonUseCase extends AbstractUseCase<CalculateCarbonDtoIn, CalculateCarbonDtoOut> {
    constructor() {
        super(CalculateCarbonDtoInSchema, CalculateCarbonDtoOutSchema);
    }

    protected async executeUseCase(dataIn: CalculateCarbonDtoIn): Promise<CalculateCarbonDtoOut> {
        const carbonByMode = new Map<TripMode, number>();
        let totalDistanceMeters = 0;
        let totalCarbonGrams = 0;

        for (const segment of dataIn.segments) {
            const carbonGrams = (segment.distanceMeters / 1000) * CARBON_FACTORS[segment.mode];
            carbonByMode.set(segment.mode, (carbonByMode.get(segment.mode) ?? 0) + carbonGrams);
            totalDistanceMeters += segment.distanceMeters;
            totalCarbonGrams += carbonGrams;
        }

        const byMode = [...carbonByMode.entries()].map(([mode, carbonGrams]) => ({
            mode,
            carbonGrams,
            percent: totalCarbonGrams === 0 ? 0 : (carbonGrams / totalCarbonGrams) * 100,
        }));

        // Référence : le même trajet entièrement en voiture.
        const carFactor: number = CARBON_FACTORS.car;
        const carReferenceCarbonGrams = (totalDistanceMeters / 1000) * carFactor;
        const savedCarbonGrams = Math.max(0, carReferenceCarbonGrams - totalCarbonGrams);
        const savedPercent = carReferenceCarbonGrams === 0 ? 0 : (savedCarbonGrams / carReferenceCarbonGrams) * 100;
        const equivalentCarKilometers = carFactor === 0 ? 0 : savedCarbonGrams / carFactor;

        return {
            totalCarbonGrams,
            byMode,
            carReferenceCarbonGrams,
            savedCarbonGrams,
            savedPercent,
            equivalentCarKilometers,
        };
    }
}
