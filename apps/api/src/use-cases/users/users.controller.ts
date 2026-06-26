import { Body, Controller, Post } from "@nestjs/common";
import { CreateUserDtoOut } from "@urbanflow/app-front-back-lib";
import { CreateUserUseCase } from "./create-user.use-case";

@Controller("users")
export class UsersController {
    constructor(private readonly createUserUseCase: CreateUserUseCase) {}

    @Post("register")
    async register(@Body() body: unknown): Promise<CreateUserDtoOut> {
        return this.createUserUseCase.execute(body);
    }
}
