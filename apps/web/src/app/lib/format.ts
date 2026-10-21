const parisClock = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Heure de Paris (« 07:45 ») d'un instant ISO 8601, quel que soit le fuseau du téléphone. */
export function formatParisClock(isoDateTime: string): string {
  return parisClock.format(new Date(isoDateTime));
}

/** Écart en minutes entre l'heure prévue et l'heure estimée (positif = retard). */
export function delayInMinutes(scheduledIso: string, expectedIso: string): number {
  return Math.round((Date.parse(expectedIso) - Date.parse(scheduledIso)) / 60_000);
}
