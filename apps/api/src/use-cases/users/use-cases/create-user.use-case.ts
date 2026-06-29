import { Injectable, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import {
    CreateUserDtoIn,
    CreateUserDtoInSchema,
    CreateUserDtoOut,
    CreateUserDtoOutSchema,
} from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

@Injectable()
export class CreateUserUseCase extends AbstractUseCase<CreateUserDtoIn, CreateUserDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(CreateUserDtoInSchema, CreateUserDtoOutSchema);
    }

    protected async executeUseCase(dataIn: CreateUserDtoIn): Promise<CreateUserDtoOut> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dataIn.email },
            select: { id: true },
        });
        if (existingUser) {
            throw new ConflictException("EMAIL_ALREADY_EXISTS");
        }

        const passwordHash = await bcrypt.hash(dataIn.password, 12);

        return this.prisma.user.create({
            data: { email: dataIn.email, name: dataIn.name, passwordHash },
            select: { id: true, email: true, name: true },
        });
    }
}