import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type { Request } from "express";
import { HttpExceptionFilter } from "./shared/core/http-exception.filter";
import { HealthController } from "./shared/health/health.controller";
import { DatabaseModule } from "./shared/database/database.module";
import { UsersModule } from "./use-cases/users/users.module";
import { TripsModule } from "./use-cases/trips/trips.module";
import { CarbonModule } from "./use-cases/carbon/carbon.module";
import { AuthModule } from "./use-cases/auth/auth.module";
import { TransportModule } from "./use-cases/transport/transport.module";

function trackerFromRequest(request: Request): string {
    const cloudflareClientIp = request.headers["cf-connecting-ip"];
    if (typeof cloudflareClientIp === "string") {
        return cloudflareClientIp;
    }
    return request.ip ?? "unknown";
}

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ThrottlerModule.forRoot({
            throttlers: [{ ttl: 60_000, limit: 100 }],
            getTracker: (request) => trackerFromRequest(request as unknown as Request),
        }),
        DatabaseModule,
        UsersModule,
        TripsModule,
        CarbonModule,
        AuthModule,
        TransportModule,
    ],
    controllers: [HealthController],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
    ],
})
export class AppModule {}