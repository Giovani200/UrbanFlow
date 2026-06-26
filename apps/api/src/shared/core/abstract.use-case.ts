import { BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { z as zod } from "zod";
import { PrismaService } from "../database/prisma.service";

export abstract class AbstractUseCase<DataIn, DataOut> {
    protected constructor(
        protected readonly prisma: PrismaService,
        private readonly dataInSchema: zod.ZodType<DataIn>,
        private readonly dataOutSchema: zod.ZodType<DataOut>,
    ) {}

    async execute(rawInput: unknown): Promise<DataOut> {
        const dataIn = this.validateAgainstSchema(this.dataInSchema, rawInput, "ENTRÉE");
        const result = await this.executeUseCase(dataIn);
        return this.validateAgainstSchema(this.dataOutSchema, result, "SORTIE");
    }

    private validateAgainstSchema<T>(schema: zod.ZodType<T>, data: unknown, direction: "ENTRÉE" | "SORTIE"): T {
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
            if (direction === "ENTRÉE") {
                throw new BadRequestException({ direction, issues: parsed.error.issues });
            }
            throw new InternalServerErrorException({ direction, issues: parsed.error.issues });
        }
        return parsed.data;
    }

    protected abstract executeUseCase(dataIn: DataIn): Promise<DataOut>;
}