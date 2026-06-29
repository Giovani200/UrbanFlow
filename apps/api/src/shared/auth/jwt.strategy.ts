import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";

export const AUTH_COOKIE_NAME = "urbanflow_token";

interface JwtPayload {
    sub: string;
    email: string;
}

export interface AuthenticatedUser {
    userId: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: Request): string | null => request?.cookies?.[AUTH_COOKIE_NAME] ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
        });
    }

    validate(payload: JwtPayload): AuthenticatedUser {
        return { userId: payload.sub, email: payload.email };
    }
}
