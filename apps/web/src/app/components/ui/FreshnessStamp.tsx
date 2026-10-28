export type Freshness = "realtime" | "scheduled" | "stale";

function formatAge(ageSeconds: number): string {
    return ageSeconds < 60 ? `il y a ${ageSeconds} s` : `il y a ${Math.floor(ageSeconds / 60)} min`;
}

function FreshnessIcon({ freshness }: { freshness: Freshness }) {
    const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, "aria-hidden": true };
    if (freshness === "scheduled") {
        return (
            <svg {...common}>
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
            </svg>
        );
    }
    return (
        <svg {...common}>
            <circle cx="12" cy="12" r="2" />
            {freshness === "realtime" ? (
                <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
            ) : (
                <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M3 3l18 18" />
            )}
        </svg>
    );
}

/** Dit d'où vient une heure : temps réel frais, horaire prévu, ou temps réel trop ancien (traité comme prévu). */
export function FreshnessStamp({ freshness, ageSeconds }: { freshness: Freshness; ageSeconds?: number }) {
    const text =
        freshness === "realtime"
            ? `temps réel${ageSeconds === undefined ? "" : ` · ${formatAge(ageSeconds)}`}`
            : freshness === "scheduled"
              ? "horaire prévu"
              : "temps réel ancien · traité comme prévu";

    return (
        <span className={`inline-flex items-center gap-1.5 [font:var(--uf-note)] ${freshness === "realtime" ? "text-uf-ink" : "text-uf-ink-2"}`}>
            <FreshnessIcon freshness={freshness} />
            {text}
        </span>
    );
}
