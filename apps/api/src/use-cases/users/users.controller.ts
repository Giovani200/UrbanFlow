import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import {
    ChangePasswordDtoOut,
    CreateFavoriteAddressDtoOut,
    CreateUserDtoOut,
    DeleteAccountDtoOut,
    DeleteFavoriteAddressDtoOut,
    ExportUserDataDtoOut,
    GetUserProfileDtoOut,
    ListFavoriteAddressesDtoOut,
    UpdateAccountDtoOut,
    UpdatePreferencesDtoOut,
} from "@urbanflow/app-front-back-lib";
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
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import type { AuthenticatedUser } from "../../shared/auth/jwt.strategy";

@Controller("users")
export class UsersController {
    constructor(
        private readonly createUserUseCase: CreateUserUseCase,
        private readonly getUserProfileUseCase: GetUserProfileUseCase,
        private readonly updatePreferencesUseCase: UpdatePreferencesUseCase,
        private readonly updateAccountUseCase: UpdateAccountUseCase,
        private readonly changePasswordUseCase: ChangePasswordUseCase,
        private readonly deleteAccountUseCase: DeleteAccountUseCase,
        private readonly exportUserDataUseCase: ExportUserDataUseCase,
        private readonly createFavoriteAddressUseCase: CreateFavoriteAddressUseCase,
        private readonly listFavoriteAddressesUseCase: ListFavoriteAddressesUseCase,
        private readonly deleteFavoriteAddressUseCase: DeleteFavoriteAddressUseCase,
    ) {}

    @Post("register")
    async register(@Body() body: unknown): Promise<CreateUserDtoOut> {
        return this.createUserUseCase.execute(body);
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: AuthenticatedUser): Promise<GetUserProfileDtoOut> {
        return this.getUserProfileUseCase.execute(user, undefined);
    }

    @Patch("me")
    @UseGuards(JwtAuthGuard)
    async updateAccount(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown): Promise<UpdateAccountDtoOut> {
        return this.updateAccountUseCase.execute(user, body);
    }

    @Patch("me/password")
    @UseGuards(JwtAuthGuard)
    async changePassword(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: unknown,
    ): Promise<ChangePasswordDtoOut> {
        return this.changePasswordUseCase.execute(user, body);
    }

    @Delete("me")
    @UseGuards(JwtAuthGuard)
    async deleteAccount(@CurrentUser() user: AuthenticatedUser): Promise<DeleteAccountDtoOut> {
        return this.deleteAccountUseCase.execute(user, undefined);
    }

    @Get("me/export")
    @UseGuards(JwtAuthGuard)
    async exportData(@CurrentUser() user: AuthenticatedUser): Promise<ExportUserDataDtoOut> {
        return this.exportUserDataUseCase.execute(user, undefined);
    }

    @Put("me/preferences")
    @UseGuards(JwtAuthGuard)
    async updatePreferences(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: unknown,
    ): Promise<UpdatePreferencesDtoOut> {
        return this.updatePreferencesUseCase.execute(user, body);
    }

    @Get("me/addresses")
    @UseGuards(JwtAuthGuard)
    async listAddresses(@CurrentUser() user: AuthenticatedUser): Promise<ListFavoriteAddressesDtoOut> {
        return this.listFavoriteAddressesUseCase.execute(user, undefined);
    }

    @Post("me/addresses")
    @UseGuards(JwtAuthGuard)
    async createAddress(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: unknown,
    ): Promise<CreateFavoriteAddressDtoOut> {
        return this.createFavoriteAddressUseCase.execute(user, body);
    }

    @Delete("me/addresses/:id")
    @UseGuards(JwtAuthGuard)
    async deleteAddress(
        @CurrentUser() user: AuthenticatedUser,
        @Param("id") id: string,
    ): Promise<DeleteFavoriteAddressDtoOut> {
        return this.deleteFavoriteAddressUseCase.execute(user, { id });
    }
}