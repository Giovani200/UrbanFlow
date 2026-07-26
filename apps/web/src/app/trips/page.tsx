"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, History, Loader2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import type { TripHistoryPeriod } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useTripHistory } from "@/app/hooks/useTripHistory";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";

const FILTERS: { id: TripHistoryPeriod; label: string }[] = [
  { id: "week", label: "Cette semaine" },
  { id: "month", label: "Ce mois" },
  { id: "all", label: "Tout" },
];

const PAGE_SIZE = 10;

function formatKg(grams: number): string {
  return (grams / 1000).toFixed(1).replace(".", ",");
}

function formatTotalHours(seconds: number): string {
  const hours = seconds / 3600;
  return hours >= 10 ? `${Math.round(hours)}` : hours.toFixed(1).replace(".", ",");
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
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

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg font-sans">
      {/* Header */}
      <div className="bg-white border-b border-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-ink" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold text-ink">Mes trajets</h1>
        <button
          onClick={refresh}
          disabled={loading || refreshing}
          aria-label="Actualiser"
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-60"
        >
          <RefreshCw size={16} className={`text-ink ${loading || refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white border-b border-border px-4 py-2.5 flex gap-2 shrink-0">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => changePeriod(filter.id)}
            className={`px-3.5 py-1.5 rounded-2xl border-[1.5px] text-[12px] transition-colors ${
              period === filter.id
                ? "border-primary bg-primary-tint font-semibold text-primary"
                : "border-border bg-white text-text-2"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Résumé */}
      <div className="bg-white border-b border-border flex shrink-0">
        <div className="flex-1 py-2.5 text-center">
          <p className="font-mono text-[18px] font-bold text-ink">{data?.total ?? 0}</p>
          <p className="text-[10px] text-text-2">trajets</p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 py-2.5 text-center">
          <p className="font-mono text-[18px] font-bold text-success">
            {formatKg(data?.totalSavedGrams ?? 0)}
          </p>
          <p className="text-[10px] text-text-2">kg CO₂ évités</p>
        </div>
        <div className="w-px bg-border" />
        <div className="flex-1 py-2.5 text-center">
          <p className="font-mono text-[18px] font-bold text-ink">
            {formatTotalHours(data?.totalDurationSeconds ?? 0)}h
          </p>
          <p className="text-[10px] text-text-2">en déplacement</p>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8 flex flex-col gap-2">
        {loading ? (
          <div role="status" className="flex-1 flex items-center justify-center py-10">
            <Loader2 size={22} className="animate-spin text-primary" />
            <span className="sr-only">Chargement des trajets…</span>
          </div>
        ) : !data || data.total === 0 ? (
          <div className="bg-white rounded-xl px-5 py-10 text-center flex flex-col items-center gap-3">
            <History size={26} className="text-text-2" />
            <p className="text-[15px] font-semibold text-ink">Aucun trajet enregistré</p>
            <p className="text-[13px] text-text-2 leading-relaxed max-w-[280px]">
              Planifie un trajet, suis-le, et marque-le comme fait à l&apos;arrivée pour le retrouver ici.
            </p>
          </div>
        ) : (
          <>
            {data.items.map((trip) => {
              const meta = MODE_META[trip.modes[0]] ?? MODE_FALLBACK;
              const Icon = meta.icon;
              const isClean = trip.carbonGrams === 0;
              return (
                <div key={trip.id} className="bg-white rounded-xl px-3.5 py-3 flex items-center gap-3">
                  <div
                    className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}1A` }}
                  >
                    <Icon size={18} style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">
                      {trip.originLabel} <span className="text-text-2">→</span> {trip.destinationLabel}
                    </p>
                    <p className="text-[11px] text-text-2 mt-0.5">
                      {formatDate(trip.takenAt)} · {formatDuration(trip.durationSeconds)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono text-[12px] font-bold ${isClean ? "text-success" : "text-primary"}`}>
                      {Math.round(trip.carbonGrams)} gCO₂
                    </p>
                    <p className="text-[10px] text-text-2 mt-0.5">émissions</p>
                  </div>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-2 px-1">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-40"
                  aria-label="Page précédente"
                >
                  <ChevronLeft size={16} className="text-ink" />
                </button>
                <span className="text-[12px] font-mono text-text-2">
                  Page {data.page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                  className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-40"
                  aria-label="Page suivante"
                >
                  <ChevronRight size={16} className="text-ink" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}