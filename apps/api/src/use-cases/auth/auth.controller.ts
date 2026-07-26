import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import type { CookieOptions, Request, Response } from "express";
import { LoginDtoOut } from "@urbanflow/app-front-back-lib";
import { LoginUseCase } from "./use-cases/login.use-case";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { AUTH_COOKIE_NAME } from "../../shared/auth/jwt.strategy";
import type { AuthenticatedUser } from "../../shared/auth/jwt.strategy";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller("auth")
export class AuthController {
    constructor(
        private readonly loginUseCase: LoginUseCase,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    @Post("login")
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @HttpCode(200)
    async login(
        @Body() body: unknown,
        @Res({ passthrough: true }) response: Response,
    ): Promise<LoginDtoOut> {
        const user = await this.loginUseCase.execute(body);
        this.setAuthCookie(response, user.id, user.email);
        return user;
    }

    @Post("logout")
    @HttpCode(200)
    logout(@Res({ passthrough: true }) response: Response): { success: true } {
        response.clearCookie(AUTH_COOKIE_NAME, this.cookieOptions());
        return { success: true };
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
        return user;
    }

    @Get("google")
    @UseGuards(AuthGuard("google"))
    googleLogin(): void {
        // Redirection vers Google.
    }

    @Get("google/callback")
    @UseGuards(AuthGuard("google"))
    googleCallback(@Req() request: Request, @Res() response: Response): void {
        // req.user = LoginDtoOut renvoyé par GoogleStrategy.validate.
        const user = request.user as LoginDtoOut;
        this.setAuthCookie(response, user.id, user.email);
        response.redirect(this.webOrigin());
    }

    private webOrigin(): string {
        return this.configService.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
    }

    private setAuthCookie(response: Response, userId: string, email: string): void {
        const token = this.jwtService.sign({ sub: userId, email });
        response.cookie(AUTH_COOKIE_NAME, token, { ...this.cookieOptions(), maxAge: COOKIE_MAX_AGE_MS });
    }

    private cookieOptions(): CookieOptions {
        return {
            httpOnly: true,
            sameSite: "lax",
            secure: this.configService.get<string>("NODE_ENV") === "production",
            path: "/",
        };
    }
}
