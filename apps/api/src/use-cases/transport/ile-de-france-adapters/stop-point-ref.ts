const RAIL_STOP_POINT = /^stop_point:IDFM:monomodalStopPlace:(\d+)$/;
const QUAY_STOP_POINT = /^stop_point:IDFM:(\d+)$/;

/**
 * Traduit un point d'arrêt Navitia en MonitoringRef SIRI (vérifié le 14/10/2026 sur Melun, Gare de Lyon et Henri Wallon).
 * Le numéro d'une zone d'arrêt Navitia (`stop_area`) ne correspond pas à SIRI : on renvoie `null`.
 */
export function toSiriMonitoringRef(navitiaStopPointId: string): string | null {
    const rail = RAIL_STOP_POINT.exec(navitiaStopPointId);
    if (rail) {
        return `STIF:StopArea:SP:${rail[1]}:`;
    }
    const quay = QUAY_STOP_POINT.exec(navitiaStopPointId);
    if (quay) {
        return `STIF:StopPoint:Q:${quay[1]}:`;
    }
    return null;
}
