import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./shared/database/database.module";
import { UsersModule } from "./use-cases/users/users.module";
import { TransportModule } from "./use-cases/transport/transport.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        UsersModule,
        TransportModule,
    ],
})
export class AppModule {}