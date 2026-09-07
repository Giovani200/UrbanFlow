"use client";

import { ArrowLeft, ArrowRight, ChevronRight, Leaf, Navigation, Loader2 } from "lucide-react";
import { MODE_META, MODE_FALLBACK } from "@/app/lib/mode-meta";
import { useBottomSheetDrag } from "@/app/hooks/useBottomSheetDrag";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { useFocusOnMount } from "@/app/hooks/useFocusOnMount";
import type { TripRoute } from "@/app/services/trips.service";

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getBadge(route: TripRoute, index: number): { label: string; green: boolean } | null {
  if (route.totalCarbonGrams === 0) return { label: "Zéro carbone", green: true };
  if (index === 0) return { label: "Recommandé", green: true };
  return null;
}

function carbonColor(grams: number, meters: number): string {
  if (grams === 0) return "#11805A";
  const km = meters / 1000;
  const perKm = km > 0 ? grams / km : grams;
  if (perKm <= 30) return "#11805A";
  if (perKm <= 100) return "#B45309";
  return "#9A1B2F";
}

interface Props {
  routes: TripRoute[];
  loading: boolean;
  originLabel: string;
  destLabel: string;
  onBack: () => void;
  onStart: () => void;
  onSelectRoute: (index: number) => void;
  selectedIndex: number;
  noTransitNotice?: boolean;
}

export function ResultsDrawer({
  routes,
  loading,
  originLabel,
  destLabel,
  onBack,
  onStart,
  onSelectRoute,
  selectedIndex,
  noTransitNotice,
}: Props) {
  const {
    dragY, dragging, collapsed,
    onTouchStart, onTouchMove, onTouchEnd,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
  } = useBottomSheetDrag({ collapsible: true });

  const panelRef = useFocusOnMount<HTMLDivElement>();
  useEscapeKey(onBack);

  const minDuration = routes.length > 0
    ? formatDuration(Math.min(...routes.map((route) => route.totalDurationSeconds)))
    : "";

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 flex items-center gap-2.5">
        <button
          onClick={onBack}
          aria-label="Retour à la recherche"
          className="w-[42px] h-[42px] rounded-xl bg-white shadow-lg flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-ink" />
        </button>
        <div className="flex-1 bg-white rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-eco shrink-0" />
          <span className="text-[13px] text-text-2 truncate">{originLabel}</span>
          <ArrowRight size={13} className="text-text-2 shrink-0" />
          <span className="text-[13px] font-semibold text-ink truncate">{destLabel}</span>
        </div>
      </div>

      <div
        ref={panelRef}
        role="region"
        aria-label="Itinéraires proposés"
        tabIndex={-1}
        className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl"
        style={{
          transform: collapsed
            ? `translateY(calc(100% - 88px + ${dragY}px))`
            : `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div
          className="flex justify-center py-3 touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        <p className="sr-only" aria-live="polite">
          {loading
            ? "Calcul des itinéraires en cours"
            : routes.length === 0
              ? "Aucun itinéraire trouvé"
              : `${routes.length} itinéraire${routes.length > 1 ? "s" : ""} proposé${routes.length > 1 ? "s" : ""}`}
        </p>

        <div className="px-4 pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={28} className="text-primary animate-spin" />
              <p className="text-sm text-text-2">Calcul des itinéraires…</p>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-text-2">Aucun itinéraire trouvé</p>
            </div>
          ) : (
            <>
              {noTransitNotice && (
                <div role="status" className="mb-3 rounded-lg bg-bg px-3 py-2 text-[13px] text-text-2">
                  Aucun transport en commun trouvé pour cet horaire.
                </div>
              )}
              <div className="flex justify-between items-center mb-3">
                <p className="text-[15px] font-bold text-ink">
                  {routes.length} itinéraire{routes.length > 1 ? "s" : ""} trouvé{routes.length > 1 ? "s" : ""}
                </p>
                <span className="text-xs text-text-2">À partir de {minDuration}</span>
              </div>

              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {routes.map((route, index) => {
                  const isSelected = selectedIndex === index;
                  const badge = getBadge(route, index);
                  const carbonHex = carbonColor(route.totalCarbonGrams, route.totalDistanceMeters);

                  return (
                    <div
                      key={index}
                      onClick={() => onSelectRoute(index)}
                      className={`rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                        isSelected ? "" : "border-border bg-white"
                      }`}
                      style={isSelected ? { borderColor: carbonHex, background: `${carbonHex}14` } : undefined}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {route.segments.map((segment, segmentIndex) => {
                            const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
                            const Icon = meta.icon;
                            const isTransit = segment.mode === "tram" || segment.mode === "bus";
                            return (
                              <span key={segmentIndex} className="flex items-center gap-1.5">
                                <span className="flex items-center gap-1">
                                  <span
                                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: `${meta.color}1A` }}
                                  >
                                    <Icon size={13} style={{ color: meta.color }} />
                                  </span>
                                  {isTransit && segment.lineShortName ? (
                                    <span
                                      className="num text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                                      style={{
                                        background: segment.lineColor ?? meta.color,
                                        color: segment.lineTextColor ?? "#FFFFFF",
                                      }}
                                    >
                                      {segment.lineShortName}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-medium text-ink">{meta.label}</span>
                                  )}
                                </span>
                                {segmentIndex < route.segments.length - 1 && (
                                  <ChevronRight size={10} className="text-border" />
                                )}
                              </span>
                            );
                          })}
                        </div>
                        {badge && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            badge.green ? "bg-[#E4F3EC] text-eco" : "bg-primary text-white"
                          }`}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-baseline gap-1">
                          <Leaf size={15} style={{ color: carbonHex }} className="self-center" />
                          <span className="num text-[16px] font-bold" style={{ color: carbonHex }}>
                            {Math.round(route.totalCarbonGrams)}
                          </span>
                          <span className="num text-[11px]" style={{ color: carbonHex }}>gCO₂</span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="num text-[15px] font-bold text-ink">
                            {formatDuration(route.totalDurationSeconds)}
                          </span>
                          <span className="text-xs text-text-2">
                            {formatDistance(route.totalDistanceMeters)}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <button
                          onClick={onStart}
                          className="mt-2.5 w-full text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                          style={{ background: carbonHex }}
                        >
                          <Navigation size={15} />
                          Choisir cet itinéraire
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}