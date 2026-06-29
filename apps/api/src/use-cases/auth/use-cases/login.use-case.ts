import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import {
    LoginDtoIn,
    LoginDtoInSchema,
    LoginDtoOut,
    LoginDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class LoginUseCase extends AbstractUseCase<LoginDtoIn, LoginDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(LoginDtoInSchema, LoginDtoOutSchema);
    }

    protected async executeUseCase(dataIn: LoginDtoIn): Promise<LoginDtoOut> {
        const user = await this.prisma.user.findUnique({
            where: { email: dataIn.email },
            select: { id: true, email: true, name: true, passwordHash: true },
        });

        if (!user || !user.passwordHash) {
            throw new UnauthorizedException("INVALID_CREDENTIALS");
        }

        const passwordMatches = await bcrypt.compare(dataIn.password, user.passwordHash);
        if (!passwordMatches) {
            throw new UnauthorizedException("INVALID_CREDENTIALS");
        }

        return { id: user.id, email: user.email, name: user.name };
    }
}
