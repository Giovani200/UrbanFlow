import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile, Strategy } from "passport-google-oauth20";
import { LoginDtoOut } from "@urbanflow/app-front-back-lib";
import { OAuthLoginUseCase } from "./use-cases/oauth-login.use-case";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
    constructor(
        configService: ConfigService,
        private readonly oauthLoginUseCase: OAuthLoginUseCase,
    ) {
        super({
            clientID: configService.getOrThrow<string>("GOOGLE_CLIENT_ID"),
            clientSecret: configService.getOrThrow<string>("GOOGLE_CLIENT_SECRET"),
            callbackURL: configService.getOrThrow<string>("GOOGLE_CALLBACK_URL"),
            scope: ["email", "profile"],
        });
    }

    // Le user renvoyé devient `req.user` dans le callback du controller.
    async validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<LoginDtoOut> {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            throw new UnauthorizedException("GOOGLE_EMAIL_MISSING");
        }

        return this.oauthLoginUseCase.execute({
            googleId: profile.id,
            email,
            name: profile.displayName ?? null,
            image: profile.photos?.[0]?.value ?? null,
        });
    }
}
