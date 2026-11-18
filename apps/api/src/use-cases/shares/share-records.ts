import { Prisma, type Share, type ShareEndReason } from "@prisma/client";
import type { PrismaService } from "../../shared/database/prisma.service";
import { expirationTime, purgeThresholds, shareStateAt } from "./share-state";

/** À la fin d'un partage, seuls l'état final et son heure restent : itinéraire, destination et position sont effacés. */
export function endedShareData(endReason: ShareEndReason, endedAt: Date): Prisma.ShareUpdateManyMutationInput {
    return {
        endedAt,
        endReason,
        itinerary: Prisma.DbNull,
        destinationLabel: null,
        estimatedArrivalAt: null,
        lastLatitude: null,
        lastLongitude: null,
        lastPositionAt: null,
    };
}

/** Termine un partage arrivé à expiration sans confirmation. Renvoie `true` s'il l'était. */
export async function endIfExpired(prisma: PrismaService, share: Share, now: Date): Promise<boolean> {
    const isExpired =
        share.endReason === null &&
        share.estimatedArrivalAt !== null &&
        shareStateAt({ endReason: null, estimatedArrivalAt: share.estimatedArrivalAt, now }) === "expired";
    if (isExpired && share.estimatedArrivalAt) {
        await prisma.share.update({
            where: { id: share.id },
            data: endedShareData("EXPIRED", expirationTime(share.estimatedArrivalAt)),
        });
    }
    return isExpired;
}

export async function findActiveShare(prisma: PrismaService, userId: string, now: Date): Promise<Share | null> {
    const share = await prisma.share.findFirst({ where: { userId, endReason: null }, orderBy: { startedAt: "desc" } });
    if (!share || (await endIfExpired(prisma, share, now))) {
        return null;
    }
    return share;
}

export async function purgeEndedShares(prisma: PrismaService, now: Date): Promise<void> {
    const { endedBefore, estimatedArrivalBefore } = purgeThresholds(now);
    await prisma.share.deleteMany({
        where: {
            OR: [{ endedAt: { lte: endedBefore } }, { endedAt: null, estimatedArrivalAt: { lte: estimatedArrivalBefore } }],
        },
    });
}
