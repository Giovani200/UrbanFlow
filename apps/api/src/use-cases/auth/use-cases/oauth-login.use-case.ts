import { Injectable } from "@nestjs/common";
import { z as zod } from "zod";
import { LoginDtoOut, LoginDtoOutSchema } from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";

const OAuthLoginCommandSchema = zod.object({
    googleId: zod.string(),
    email: zod.email(),
    name: zod.string().nullable(),
    image: zod.string().nullable(),
});
type OAuthLoginCommand = zod.output<typeof OAuthLoginCommandSchema>;

@Injectable()
export class OAuthLoginUseCase extends AbstractUseCase<OAuthLoginCommand, LoginDtoOut> {
    constructor(private readonly prisma: PrismaService) {
        super(OAuthLoginCommandSchema, LoginDtoOutSchema);
    }

    protected async executeUseCase(dataIn: OAuthLoginCommand): Promise<LoginDtoOut> {
        // 1. Compte déjà lié par googleId.
        const linkedUser = await this.prisma.user.findUnique({
            where: { googleId: dataIn.googleId },
            select: { id: true, email: true, name: true },
        });
        if (linkedUser) {
            return linkedUser;
        }

        // 2. Email déjà inscrit (mot de passe)
        const existingByEmail = await this.prisma.user.findUnique({
            where: { email: dataIn.email },
            select: { id: true },
        });
        if (existingByEmail) {
            return this.prisma.user.update({
                where: { id: existingByEmail.id },
                data: { googleId: dataIn.googleId, image: dataIn.image ?? undefined },
                select: { id: true, email: true, name: true },
            });
        }

        // 3. Nouveau compte Google
        return this.prisma.user.create({
            data: {
                email: dataIn.email,
                name: dataIn.name,
                googleId: dataIn.googleId,
                image: dataIn.image,
                emailVerified: new Date(),
                acceptedTermsAt: new Date(),
            },
            select: { id: true, email: true, name: true },
        });
    }
}
