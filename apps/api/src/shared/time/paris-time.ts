const PARIS_TIME_ZONE = "Europe/Paris";
const NAVITIA_DATE_TIME_PATTERN = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/;
const MILLISECONDS_PER_MINUTE = 60_000;

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TIME_ZONE,
    timeZoneName: "longOffset",
});
const dayKeyFormatter = new Intl.DateTimeFormat("fr-CA", { timeZone: PARIS_TIME_ZONE });

function parisOffsetMinutes(instant: Date): number {
    const label = offsetFormatter.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value;
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(label ?? "");
    if (!match) {
        return 0;
    }
    const minutes = Number(match[2]) * 60 + Number(match[3]);
    return match[1] === "-" ? -minutes : minutes;
}

function twoDigits(value: number): string {
    return String(value).padStart(2, "0");
}

function formatOffset(offsetMinutes: number): string {
    const sign = offsetMinutes < 0 ? "-" : "+";
    const absoluteMinutes = Math.abs(offsetMinutes);
    return `${sign}${twoDigits(Math.floor(absoluteMinutes / 60))}:${twoDigits(absoluteMinutes % 60)}`;
}

function toParisIso(instant: Date): string {
    const offsetMinutes = parisOffsetMinutes(instant);
    const local = new Date(instant.getTime() + offsetMinutes * MILLISECONDS_PER_MINUTE);
    const date = `${local.getUTCFullYear()}-${twoDigits(local.getUTCMonth() + 1)}-${twoDigits(local.getUTCDate())}`;
    const time = `${twoDigits(local.getUTCHours())}:${twoDigits(local.getUTCMinutes())}:${twoDigits(local.getUTCSeconds())}`;
    return `${date}T${time}${formatOffset(offsetMinutes)}`;
}

/** Convertit une heure UTC (format SIRI, ex. « 2026-10-14T09:31:00.000Z ») en ISO 8601 à l'heure de Paris. */
export function utcToParisIso(utcIso: string): string {
    return toParisIso(new Date(utcIso));
}

/**
 * Convertit une heure locale Navitia (« YYYYMMDDTHHMMSS », heure de Paris sans décalage) en ISO 8601 avec décalage.
 * Le décalage dépend de l'instant lui-même : on l'estime une première fois, puis on le corrige pour les heures
 * proches d'un changement d'heure.
 */
export function navitiaLocalToParisIso(navitiaDateTime: string): string {
    const match = NAVITIA_DATE_TIME_PATTERN.exec(navitiaDateTime);
    if (!match) {
        throw new Error(`NAVITIA_DATE_TIME_INVALID: ${navitiaDateTime}`);
    }
    const [, year, month, day, hours, minutes, seconds] = match.map(Number);
    const localAsUtc = Date.UTC(year, month - 1, day, hours, minutes, seconds);
    const firstEstimate = localAsUtc - parisOffsetMinutes(new Date(localAsUtc)) * MILLISECONDS_PER_MINUTE;
    const instant = localAsUtc - parisOffsetMinutes(new Date(firstEstimate)) * MILLISECONDS_PER_MINUTE;
    return toParisIso(new Date(instant));
}

/** Formate une heure locale saisie (« 2026-10-14T08:05 ») pour Navitia (« 20261014T080500 »). */
export function toNavitiaDateTime(localDateTime: string): string {
    return `${localDateTime.replace(/[-:]/g, "")}00`;
}

/** Jour courant à Paris (« 2026-10-14 »), pour remettre les quotas à zéro à minuit heure de Paris. */
export function parisDayKey(instant: Date): string {
    return dayKeyFormatter.format(instant);
}
