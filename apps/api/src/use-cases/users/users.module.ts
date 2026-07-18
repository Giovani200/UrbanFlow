import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { UsersController } from "./users.controller";
import { CreateUserUseCase } from "./use-cases/create-user.use-case";
import { GetUserProfileUseCase } from "./use-cases/get-user-profile.use-case";
import { UpdatePreferencesUseCase } from "./use-cases/update-preferences.use-case";
import { UpdateAccountUseCase } from "./use-cases/update-account.use-case";
import { ChangePasswordUseCase } from "./use-cases/change-password.use-case";
import { DeleteAccountUseCase } from "./use-cases/delete-account.use-case";
import { ExportUserDataUseCase } from "./use-cases/export-user-data.use-case";
import { CreateFavoriteAddressUseCase } from "./use-cases/create-favorite-address.use-case";
import { ListFavoriteAddressesUseCase } from "./use-cases/list-favorite-addresses.use-case";
import { DeleteFavoriteAddressUseCase } from "./use-cases/delete-favorite-address.use-case";

@Module({
    imports: [PassportModule],
    controllers: [UsersController],
    providers: [
        CreateUserUseCase,
        GetUserProfileUseCase,
        UpdatePreferencesUseCase,
        UpdateAccountUseCase,
        ChangePasswordUseCase,
        DeleteAccountUseCase,
        ExportUserDataUseCase,
        CreateFavoriteAddressUseCase,
        ListFavoriteAddressesUseCase,
        DeleteFavoriteAddressUseCase,
    ],
})
export class UsersModule {}
