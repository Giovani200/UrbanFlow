"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractUseCase = void 0;
const common_1 = require("@nestjs/common");
class AbstractUseCase {
    prisma;
    dataInSchema;
    dataOutSchema;
    constructor(prisma, dataInSchema, dataOutSchema) {
        this.prisma = prisma;
        this.dataInSchema = dataInSchema;
        this.dataOutSchema = dataOutSchema;
    }
    async execute(rawInput) {
        const dataIn = this.validateAgainstSchema(this.dataInSchema, rawInput, "ENTRÉE");
        const result = await this.executeUseCase(dataIn);
        return this.validateAgainstSchema(this.dataOutSchema, result, "SORTIE");
    }
    validateAgainstSchema(schema, data, direction) {
        const parsed = schema.safeParse(data);
        if (!parsed.success) {
            if (direction === "ENTRÉE") {
                throw new common_1.BadRequestException({ direction, issues: parsed.error.issues });
            }
            throw new common_1.InternalServerErrorException({ direction, issues: parsed.error.issues });
        }
        return parsed.data;
    }
}
exports.AbstractUseCase = AbstractUseCase;
//# sourceMappingURL=abstract.use-case.js.map