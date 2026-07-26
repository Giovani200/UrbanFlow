import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { PrismaService } from "../database/prisma.service";

export const AUTH_COOKIE_NAME = "urbanflow_token";

interface JwtPayload {
    sub: string;
    email: string;
    iat: number;
}

export interface AuthenticatedUser {
    userId: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request): string | null => request?.cookies?.[AUTH_COOKIE_NAME] ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: { sessionsInvalidatedAt: true },
        });

        if (!user) {
            throw new UnauthorizedException();
        }

        const issuedAt = new Date(payload.iat * 1000);
        if (user.sessionsInvalidatedAt && issuedAt < user.sessionsInvalidatedAt) {
            throw new UnauthorizedException();
        }

        return { userId: payload.sub, email: payload.email };
    }
}