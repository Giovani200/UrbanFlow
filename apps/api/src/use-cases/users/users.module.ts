import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { CreateUserUseCase } from "./create-user.use-case";

@Module({
    controllers: [UsersController],
    providers: [CreateUserUseCase],
})
export class UsersModule {}
