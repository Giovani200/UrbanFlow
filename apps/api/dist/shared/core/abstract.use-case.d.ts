import { z as zod } from "zod";
import { PrismaService } from "../database/prisma.service";
export declare abstract class AbstractUseCase<DataIn, DataOut> {
    protected readonly prisma: PrismaService;
    private readonly dataInSchema;
    private readonly dataOutSchema;
    protected constructor(prisma: PrismaService, dataInSchema: zod.ZodType<DataIn>, dataOutSchema: zod.ZodType<DataOut>);
    execute(rawInput: unknown): Promise<DataOut>;
    private validateAgainstSchema;
    protected abstract executeUseCase(dataIn: DataIn): Promise<DataOut>;
}
