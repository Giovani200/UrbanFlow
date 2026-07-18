import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { z as zod } from "zod";

export function validateUseCaseData<T>(
    direction: "ENTRÉE" | "SORTIE",
    schema: zod.ZodType<T>,
    data: unknown,
): T {
    const parsed = schema.safeParse(data);
    if (parsed.success) {
        return parsed.data;
    }
    if (direction === "ENTRÉE") {
        throw new BadRequestException({ direction, issues: parsed.error.issues });
    }
    throw new InternalServerErrorException({ direction, issues: parsed.error.issues });
}

export abstract class AbstractUseCase<DataIn, DataOut> {
    protected constructor(
        private readonly dataInSchema: zod.ZodType<DataIn>,
        private readonly dataOutSchema: zod.ZodType<DataOut>,
    ) {}

    async execute(rawInput: unknown): Promise<DataOut> {
        const dataIn = validateUseCaseData("ENTRÉE", this.dataInSchema, rawInput);
        const result = await this.executeUseCase(dataIn);
        return validateUseCaseData("SORTIE", this.dataOutSchema, result);
    }

    protected abstract executeUseCase(dataIn: DataIn): Promise<DataOut>;
}