import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import {
    CreateUserDtoOut,
    GetUserProfileDtoOut,
    UpdatePreferencesDtoOut,
} from "@urbanflow/app-front-back-lib";
import { CreateUserUseCase } from "./use-cases/create-user.use-case";
import { GetUserProfileUseCase } from "./use-cases/get-user-profile.use-case";
import { UpdatePreferencesUseCase } from "./use-cases/update-preferences.use-case";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../shared/auth/jwt.strategy";

@Controller("users")
export class UsersController {
    constructor(
        private readonly createUserUseCase: CreateUserUseCase,
        private readonly getUserProfileUseCase: GetUserProfileUseCase,
        private readonly updatePreferencesUseCase: UpdatePreferencesUseCase,
    ) {}

    @Post("register")
    async register(@Body() body: unknown): Promise<CreateUserDtoOut> {
        return this.createUserUseCase.execute(body);
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: AuthenticatedUser): Promise<GetUserProfileDtoOut> {
        // userId injecté depuis le JWT, jamais depuis le client.
        return this.getUserProfileUseCase.execute({ userId: user.userId });
    }

    @Put("me/preferences")
    @UseGuards(JwtAuthGuard)
    async updatePreferences(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: unknown,
    ): Promise<UpdatePreferencesDtoOut> {
        // userId du token placé en dernier → écrase tout userId qu'un client glisserait dans le body.
        return this.updatePreferencesUseCase.execute({ ...(body as Record<string, unknown>), userId: user.userId });
    }
}
