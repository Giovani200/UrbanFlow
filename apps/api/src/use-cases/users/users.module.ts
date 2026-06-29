import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { UsersController } from "./users.controller";
import { CreateUserUseCase } from "./use-cases/create-user.use-case";
import { GetUserProfileUseCase } from "./use-cases/get-user-profile.use-case";
import { UpdatePreferencesUseCase } from "./use-cases/update-preferences.use-case";

@Module({
    imports: [PassportModule],
    controllers: [UsersController],
    providers: [CreateUserUseCase, GetUserProfileUseCase, UpdatePreferencesUseCase],
})
export class UsersModule {}
