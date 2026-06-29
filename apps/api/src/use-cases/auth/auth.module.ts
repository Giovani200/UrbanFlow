import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { LoginUseCase } from "./use-cases/login.use-case";
import { OAuthLoginUseCase } from "./use-cases/oauth-login.use-case";
import { GoogleStrategy } from "./google.strategy";
import { JwtStrategy } from "../../shared/auth/jwt.strategy";

@Module({
    imports: [
        PassportModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.getOrThrow<string>("JWT_SECRET"),
                signOptions: { expiresIn: "7d" },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [LoginUseCase, OAuthLoginUseCase, JwtStrategy, GoogleStrategy],
})
export class AuthModule {}
