import { Injectable, NotFoundException } from "@nestjs/common";
import type { Share } from "@prisma/client";
import { z as zod } from "zod";
import { ShareViewDtoOut, ShareViewDtoOutSchema, type ShareState } from "@urbanflow/app-front-back-lib";
import { AbstractUseCase } from "../../../shared/core/abstract.use-case";
import { PrismaService } from "../../../shared/database/prisma.service";
import { utcToParisIso } from "../../../shared/time/paris-time";
import { parseStoredItinerary } from "../../routines/routine-day-plan.schema";
import { RoutineConnectionsService } from "../../routines/routine-connections.service";
import { buildShareProgress, type SharePosition } from "../share-progress";
import { endedShareData, endIfExpired, purgeEndedShares } from "../share-records";
import { expirationTime, shareStateAt } from "../share-state";
import { hashShareToken } from "../share-token";

const SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const ViewShareDtoInSchema = zod.object({ token: zod.string().max(100).optional() });
type ViewShareDtoIn = zod.output<typeof ViewShareDtoInSchema>;

function firstNameOf(name: string | null): string | null {
    return name?.trim().split(/\s+/)[0] || null;
}

function lastPositionOf(share: Share): SharePosition | null {
    if (share.lastLatitude === null || share.lastLongitude === null || !share.lastPositionAt) {
        return null;
    }
    return { latitude: share.lastLatitude, longitude: share.lastLongitude, at: share.lastPositionAt };
}

function endedView(sharerFirstName: string | null, state: ShareState, endedAt: Date): ShareViewDtoOut {
    return {
        sharerFirstName,
        state,
        endedAt: utcToParisIso(endedAt.toISOString()),
        destinationLabel: null,
        estimatedArrival: null,
        steps: [],
        currentStepIndex: null,
        lastPosition: null,
    };
}

/** Vue publique d'un partage. Inconnu, purgé ou mal formé : la même réponse, pour ne rien apprendre à qui devine. */
@Injectable()
export class ViewShareUseCase extends AbstractUseCase<ViewShareDtoIn, ShareViewDtoOut> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly routineConnections: RoutineConnectionsService,
    ) {
        super(ViewShareDtoInSchema, ShareViewDtoOutSchema);
    }

    protected async executeUseCase(dataIn: ViewShareDtoIn): Promise<ShareViewDtoOut> {
        if (!dataIn.token || !SHARE_TOKEN_PATTERN.test(dataIn.token)) {
            throw new NotFoundException("SHARE_NOT_FOUND");
        }
        const now = new Date();
        await purgeEndedShares(this.prisma, now);

        const share = await this.prisma.share.findUnique({
            where: { tokenHash: hashShareToken(dataIn.token) },
            include: { user: { select: { name: true } } },
        });
        if (!share) {
            throw new NotFoundException("SHARE_NOT_FOUND");
        }
        const sharerFirstName = firstNameOf(share.user.name);

        if (share.endReason && share.endedAt) {
            return endedView(sharerFirstName, shareStateAt({ endReason: share.endReason, estimatedArrivalAt: null, now }), share.endedAt);
        }
        if (share.estimatedArrivalAt && (await endIfExpired(this.prisma, share, now))) {
            return endedView(sharerFirstName, "expired", expirationTime(share.estimatedArrivalAt));
        }
        return this.activeView(share, sharerFirstName, now);
    }

    private async activeView(share: Share, sharerFirstName: string | null, now: Date): Promise<ShareViewDtoOut> {
        const itinerary = parseStoredItinerary(share.itinerary);
        if (!itinerary) {
            throw new NotFoundException("SHARE_NOT_FOUND");
        }

        const judged = await this.routineConnections.judge(itinerary, now);
        const estimatedArrivalAt = new Date(judged.itinerary.arrivalTime);
        if (estimatedArrivalAt.getTime() !== share.estimatedArrivalAt?.getTime()) {
            await this.prisma.share.update({ where: { id: share.id }, data: { estimatedArrivalAt } });
        }

        const state = shareStateAt({ endReason: null, estimatedArrivalAt, now });
        if (state === "expired") {
            const expiredAt = expirationTime(estimatedArrivalAt);
            await this.prisma.share.update({ where: { id: share.id }, data: endedShareData("EXPIRED", expiredAt) });
            return endedView(sharerFirstName, state, expiredAt);
        }

        const progress = buildShareProgress({
            judged,
            destinationLabel: share.destinationLabel ?? "",
            lastPosition: lastPositionOf(share),
            now,
        });
        return { sharerFirstName, state, endedAt: null, destinationLabel: share.destinationLabel, ...progress };
    }
}
