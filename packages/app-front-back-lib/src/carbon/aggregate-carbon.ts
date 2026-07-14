import type { TripMode } from "../dtos/trips/trip-planning.dto";
import type { CarbonEvent, CarbonSummaryDtoOut, Period } from "../dtos/carbon/carbon-summary.dto";

// Agrégateur carbone pur, sans facteur ADEME (les grammes sont déjà calculés en amont).
// Utilisé côté serveur (à partir des CarbonEntry) et côté client (trajets locaux anonymes).
export function aggregateCarbon(
    events: CarbonEvent[],
    period: Period,
    now: Date,
    goalKg?: number | null,
): CarbonSummaryDtoOut {
    const { start, end } = periodWindow(now, period);
    const inWindow = events.filter((event) => {
        const takenAt = new Date(event.takenAt);
        return takenAt >= start && takenAt < end;
    });

    const buckets = bucketSkeleton(now, period);
    const carbonByMode = new Map<TripMode, number>();
    const tripIds = new Set<string>();
    let totalCarbonGrams = 0;
    let totalSavedGrams = 0;
    let totalDistanceMeters = 0;

    for (const event of inWindow) {
        totalCarbonGrams += event.carbonGrams;
        totalSavedGrams += event.savedGrams;
        totalDistanceMeters += event.distanceMeters;
        tripIds.add(event.tripId);
        carbonByMode.set(event.mode, (carbonByMode.get(event.mode) ?? 0) + event.carbonGrams);

        const index = bucketIndex(new Date(event.takenAt), period);
        const bucket = buckets[index];
        if (bucket) {
            bucket.carbonGrams += event.carbonGrams;
            bucket.savedGrams += event.savedGrams;
        }
    }

    const carReferenceGrams = totalCarbonGrams + totalSavedGrams;
    const savedPercent = carReferenceGrams === 0 ? 0 : (totalSavedGrams / carReferenceGrams) * 100;

    const byMode = [...carbonByMode.entries()].map(([mode, carbonGrams]) => ({
        mode,
        carbonGrams,
        percent: totalCarbonGrams === 0 ? 0 : (carbonGrams / totalCarbonGrams) * 100,
    }));

    const achievedKg = totalSavedGrams / 1000;
    const goal =
        goalKg == null
            ? null
            : {
                  targetKg: goalKg,
                  achievedKg,
                  percent: goalKg <= 0 ? 0 : Math.min(100, (achievedKg / goalKg) * 100),
              };

    return {
        period,
        tripCount: tripIds.size,
        totalCarbonGrams,
        totalSavedGrams,
        carReferenceGrams,
        savedPercent,
        equivalentCarKm: totalDistanceMeters / 1000,
        buckets,
        byMode,
        goal,
    };
}

// Fenêtre calendaire courante (semaine lundi→dimanche, mois, année).
function periodWindow(now: Date, period: Period): { start: Date; end: Date } {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (period === "week") {
        const daysSinceMonday = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - daysSinceMonday);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
    }

    if (period === "month") {
        start.setDate(1);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        return { start, end };
    }

    start.setMonth(0, 1);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    return { start, end };
}

const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// Squelette des barres : jour (semaine), semaine (mois), mois (année).
function bucketSkeleton(now: Date, period: Period): CarbonSummaryDtoOut["buckets"] {
    if (period === "week") {
        return WEEK_LABELS.map((label) => ({ label, carbonGrams: 0, savedGrams: 0 }));
    }
    if (period === "year") {
        return MONTH_LABELS.map((label) => ({ label, carbonGrams: 0, savedGrams: 0 }));
    }
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil(daysInMonth / 7);
    return Array.from({ length: weeks }, (_, index) => ({
        label: `S${index + 1}`,
        carbonGrams: 0,
        savedGrams: 0,
    }));
}

function bucketIndex(date: Date, period: Period): number {
    if (period === "week") return (date.getDay() + 6) % 7;
    if (period === "year") return date.getMonth();
    return Math.floor((date.getDate() - 1) / 7);
}
