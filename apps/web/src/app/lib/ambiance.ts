export type Ambiance = "aube" | "jour" | "crepuscule" | "nuit";

const NIGHT: Ambiance = "nuit";

/** Plages horaires en minutes depuis minuit, heure de Paris. Hors de ces plages : la nuit. */
const AMBIANCE_RANGES: ReadonlyArray<{ ambiance: Ambiance; fromMinute: number; toMinute: number }> = [
    { ambiance: "aube", fromMinute: 5 * 60, toMinute: 9 * 60 },
    { ambiance: "jour", fromMinute: 9 * 60, toMinute: 17 * 60 },
    { ambiance: "crepuscule", fromMinute: 17 * 60, toMinute: 21 * 60 },
];

export const AMBIANCE_THEME_COLORS: Record<Ambiance, string> = {
    aube: "#FFE3CC",
    jour: "#CDE7FF",
    crepuscule: "#4B2E7A",
    nuit: "#0A0F2E",
};

const parisClockFormat: Intl.DateTimeFormatOptions = {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
};
const parisClock = new Intl.DateTimeFormat("fr-FR", parisClockFormat);

function parisMinuteOfDay(instant: Date): number {
    const parts = parisClock.formatToParts(instant);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    return hour * 60 + minute;
}

/** Ambiance visuelle selon l'heure de Paris, quel que soit le fuseau du téléphone. */
export function ambianceAt(instant: Date): Ambiance {
    const minuteOfDay = parisMinuteOfDay(instant);
    const range = AMBIANCE_RANGES.find(({ fromMinute, toMinute }) => minuteOfDay >= fromMinute && minuteOfDay < toMinute);
    return range?.ambiance ?? NIGHT;
}

/**
 * Script exécuté dans le <head> avant le premier affichage, pour éviter un flash d'ambiance.
 * Il est généré à partir des mêmes constantes que `ambianceAt` : la règle horaire n'existe qu'une fois.
 */
export function ambianceScriptSource(): string {
    return `(function () {
  var root = document.documentElement;
  try {
    var ranges = ${JSON.stringify(AMBIANCE_RANGES)};
    var parts = new Intl.DateTimeFormat("fr-FR", ${JSON.stringify(parisClockFormat)}).formatToParts(new Date());
    var minuteOfDay = 0;
    for (var index = 0; index < parts.length; index++) {
      if (parts[index].type === "hour") minuteOfDay += Number(parts[index].value) * 60;
      if (parts[index].type === "minute") minuteOfDay += Number(parts[index].value);
    }
    var ambiance = ${JSON.stringify(NIGHT)};
    for (var rangeIndex = 0; rangeIndex < ranges.length; rangeIndex++) {
      var range = ranges[rangeIndex];
      if (minuteOfDay >= range.fromMinute && minuteOfDay < range.toMinute) ambiance = range.ambiance;
    }
    root.setAttribute("data-ambiance", ambiance);
  } catch (error) {
    root.setAttribute("data-ambiance", "jour");
  }
})();`;
}
