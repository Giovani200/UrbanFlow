"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, History, RefreshCw } from "lucide-react";
import type { TripHistoryPeriod } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { ChoiceChip } from "@/app/components/ui/ChoiceChip";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { PageShell } from "@/app/components/ui/PageShell";
import { useTripHistory } from "@/app/hooks/useTripHistory";
import { formatDuration, formatKilograms } from "@/app/lib/format";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";

const FILTERS: { id: TripHistoryPeriod; label: string }[] = [
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "all", label: "Tout" },
];

const PAGE_SIZE = 10;

const ROUND_BUTTON = "flex size-11 items-center justify-center rounded-full disabled:opacity-40";

function formatTotalHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours >= 10 ? `${Math.round(hours)}` : hours.toFixed(1).replace(".", ",");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TripsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [period, setPeriod] = useState<TripHistoryPeriod>("month");
  const [page, setPage] = useState(1);
  const { data, loading, refreshing, refresh } = useTripHistory(period, page, PAGE_SIZE);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login");
  }, [status, router]);

  function changePeriod(next: TripHistoryPeriod) {
    setPeriod(next);
    setPage(1);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const busy = loading || refreshing;

  const refreshButton = (
    <button type="button" onClick={refresh} disabled={busy} aria-label="Actualiser" className={`uf-glass ${ROUND_BUTTON}`}>
      <RefreshCw size={20} aria-hidden="true" />
    </button>
  );

  if (status !== "authenticated") {
    return (
      <PageShell title="Mes trajets">
        <p role="status" className="px-1 [font:var(--uf-body)] font-medium text-uf-ink-2">
          Chargement…
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Mes trajets" actions={refreshButton}>
      <GlassPanel as="section" aria-label="Résumé" className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <ChoiceChip key={filter.id} selected={period === filter.id} onClick={() => changePeriod(filter.id)}>
              {filter.label}
            </ChoiceChip>
          ))}
        </div>
        <dl className="grid grid-cols-3 gap-2">
          <div className="uf-inset flex flex-col gap-0.5 rounded-uf-inset p-3">
            <dd className="[font:var(--uf-time)] tabular-nums">{data?.total ?? 0}</dd>
            <dt className="[font:var(--uf-note)] text-uf-ink-2">trajets</dt>
          </div>
          <div className="uf-inset flex flex-col gap-0.5 rounded-uf-inset p-3">
            <dd className="[font:var(--uf-time)] tabular-nums">{formatKilograms(data?.totalSavedGrams ?? 0)} kg</dd>
            <dt className="[font:var(--uf-note)] text-uf-ink-2">CO₂ évité</dt>
          </div>
          <div className="uf-inset flex flex-col gap-0.5 rounded-uf-inset p-3">
            <dd className="[font:var(--uf-time)] tabular-nums">{formatTotalHours(data?.totalDurationSeconds ?? 0)} h</dd>
            <dt className="[font:var(--uf-note)] text-uf-ink-2">en déplacement</dt>
          </div>
        </dl>
      </GlassPanel>

      <GlassPanel as="section" aria-label="Liste des trajets" className="flex flex-col gap-2 p-3">
        {loading ? (
          <p role="status" className="p-3 [font:var(--uf-body)] font-medium text-uf-ink-2">
            Chargement des trajets…
          </p>
        ) : !data || data.total === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
            <History size={28} aria-hidden="true" />
            <p className="[font:var(--uf-time)]">Aucun trajet enregistré</p>
            <p className="max-w-[280px] [font:var(--uf-body)] font-medium text-uf-ink-2">
              Planifie un trajet, suis-le, et marque-le comme fait à l&apos;arrivée pour le retrouver ici.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {data.items.map((trip) => {
                const meta = MODE_META[trip.modes[0]] ?? MODE_FALLBACK;
                const Icon = meta.icon;
                return (
                  <li key={trip.id} className="uf-inset flex items-center gap-3 rounded-uf-inset px-4 py-3">
                    <Icon size={20} aria-label={meta.label} style={{ color: meta.color }} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate [font:var(--uf-body)]">
                        {trip.originLabel} <span aria-label="vers">→</span> {trip.destinationLabel}
                      </p>
                      <p className="[font:var(--uf-note)] text-uf-ink-2 tabular-nums">
                        {formatDate(trip.takenAt)} · {formatDuration(trip.durationSeconds)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="[font:var(--uf-note)] tabular-nums">{Math.round(trip.carbonGrams)} g CO₂</p>
                      <p className="[font:var(--uf-note)] text-uf-ink-2">émis</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  aria-label="Page précédente"
                  className={`uf-inset ${ROUND_BUTTON}`}
                >
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
                <span className="[font:var(--uf-note)] tabular-nums">
                  Page {data.page} sur {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  aria-label="Page suivante"
                  className={`uf-inset ${ROUND_BUTTON}`}
                >
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </GlassPanel>
    </PageShell>
  );
}
