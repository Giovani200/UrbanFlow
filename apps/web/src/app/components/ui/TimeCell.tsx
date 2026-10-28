const CHIP = "self-start rounded-uf-chip border border-uf-ink/20 bg-uf-inset px-2 [font:var(--uf-note)] font-bold";

interface TimeCellProps {
    scheduledTime: string;
    expectedTime?: string;
    delayMinutes?: number;
    cancelled?: boolean;
}

function formatDelay(delayMinutes: number): string {
    return delayMinutes > 0 ? `+${delayMinutes} min` : `−${Math.abs(delayMinutes)} min`;
}

/** Une heure de passage. En retard ou en avance, l'heure prévue reste visible, barrée, au-dessus de l'heure estimée. */
export function TimeCell({ scheduledTime, expectedTime, delayMinutes = 0, cancelled = false }: TimeCellProps) {
    if (cancelled) {
        return (
            <span className="flex flex-col gap-0.5 text-uf-ink">
                <s className="[font:var(--uf-time)] font-medium text-uf-ink-2 tabular-nums">{scheduledTime}</s>
                <span className="inline-flex items-center gap-1 [font:var(--uf-note)] font-bold">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    supprimé
                </span>
            </span>
        );
    }

    if (delayMinutes === 0) {
        return (
            <span className="flex flex-col gap-0.5 text-uf-ink">
                <span className="[font:var(--uf-time)] tabular-nums">{expectedTime ?? scheduledTime}</span>
                <span className="[font:var(--uf-note)]">à l&apos;heure</span>
            </span>
        );
    }

    return (
        <span className="flex flex-col gap-0.5 text-uf-ink">
            <s className="[font:var(--uf-note)] text-uf-ink-2 tabular-nums">
                <span className="sr-only">prévu </span>
                {scheduledTime}
            </s>
            <span className="[font:var(--uf-time)] tabular-nums">{expectedTime}</span>
            <span className={CHIP}>{formatDelay(delayMinutes)}</span>
        </span>
    );
}
