import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./shared/database/database.module";
import { UsersModule } from "./use-cases/users/users.module";
import { TripsModule } from "./use-cases/trips/trips.module";
import { CarbonModule } from "./use-cases/carbon/carbon.module";
import { AuthModule } from "./use-cases/auth/auth.module";

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        UsersModule,
        TripsModule,
        CarbonModule,
        AuthModule,
    ],
})
export class AppModule {}