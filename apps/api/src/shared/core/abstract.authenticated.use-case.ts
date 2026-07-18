import { UnauthorizedException } from "@nestjs/common";
import { z as zod } from "zod";
import type { AuthenticatedUser } from "../auth/jwt.strategy";
import { validateUseCaseData } from "./abstract.use-case";

export abstract class AbstractAuthenticatedUseCase<DataIn, DataOut> {
    protected constructor(
        private readonly dataInSchema: zod.ZodType<DataIn>,
        private readonly dataOutSchema: zod.ZodType<DataOut>,
    ) {}

    async execute(authenticatedUser: AuthenticatedUser, rawInput: unknown): Promise<DataOut> {
        if (!authenticatedUser?.userId) {
            throw new UnauthorizedException();
        }
        const dataIn = validateUseCaseData("ENTRÉE", this.dataInSchema, rawInput);
        const result = await this.executeUseCase(authenticatedUser, dataIn);
        return validateUseCaseData("SORTIE", this.dataOutSchema, result);
    }

    protected abstract executeUseCase(authenticatedUser: AuthenticatedUser, dataIn: DataIn): Promise<DataOut>;
}
