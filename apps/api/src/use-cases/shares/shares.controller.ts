import { Body, Controller, Delete, Get, Headers, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { CreateShareDtoOut, CurrentShareDtoOut, ShareViewDtoOut } from "@urbanflow/app-front-back-lib";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { JwtAuthGuard } from "../../shared/auth/jwt-auth.guard";
import type { AuthenticatedUser } from "../../shared/auth/jwt.strategy";
import { ConfirmShareArrivalUseCase } from "./use-cases/confirm-share-arrival.use-case";
import { CreateShareUseCase } from "./use-cases/create-share.use-case";
import { GetCurrentShareUseCase } from "./use-cases/get-current-share.use-case";
import { RecordSharePositionUseCase } from "./use-cases/record-share-position.use-case";
import { StopShareUseCase } from "./use-cases/stop-share.use-case";
import { ViewShareUseCase } from "./use-cases/view-share.use-case";

const ONE_MINUTE_MILLISECONDS = 60_000;
const ONE_HOUR_MILLISECONDS = 60 * ONE_MINUTE_MILLISECONDS;

@Controller("shares")
export class SharesController {
    constructor(
        private readonly createShareUseCase: CreateShareUseCase,
        private readonly getCurrentShareUseCase: GetCurrentShareUseCase,
        private readonly recordSharePositionUseCase: RecordSharePositionUseCase,
        private readonly confirmShareArrivalUseCase: ConfirmShareArrivalUseCase,
        private readonly stopShareUseCase: StopShareUseCase,
        private readonly viewShareUseCase: ViewShareUseCase,
    ) {}

    /** Publique : le jeton arrive par en-tête, jamais par l'URL, pour ne pas finir dans les journaux d'accès. */
    @Get("view")
    @Throttle({ default: { limit: 30, ttl: ONE_MINUTE_MILLISECONDS } })
    async view(@Headers("share-token") token: string | undefined): Promise<ShareViewDtoOut> {
        return this.viewShareUseCase.execute({ token });
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @Throttle({ default: { limit: 10, ttl: ONE_HOUR_MILLISECONDS } })
    async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown): Promise<CreateShareDtoOut> {
        return this.createShareUseCase.execute(user, body);
    }

    @Get("current")
    @UseGuards(JwtAuthGuard)
    async current(@CurrentUser() user: AuthenticatedUser): Promise<CurrentShareDtoOut> {
        return this.getCurrentShareUseCase.execute(user, undefined);
    }

    @Post("current/position")
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async recordPosition(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown): Promise<void> {
        await this.recordSharePositionUseCase.execute(user, body);
    }

    @Post("current/arrival")
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async confirmArrival(@CurrentUser() user: AuthenticatedUser): Promise<void> {
        await this.confirmShareArrivalUseCase.execute(user, undefined);
    }

    @Delete("current")
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async stop(@CurrentUser() user: AuthenticatedUser): Promise<void> {
        await this.stopShareUseCase.execute(user, undefined);
    }
}
