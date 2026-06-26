"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronRight, Bike, Bus, Footprints, Train, Leaf, Navigation, Car, Loader2 } from "lucide-react";
import { useBottomSheetDrag } from "@/app/hooks/useBottomSheetDrag";
import type { Route } from "@/app/services/routing.service";

const MODE_ICONS: Record<string, React.ElementType> = {
  walk: Footprints,
  tram: Train,
  bus:  Bus,
  bike: Bike,
  carpool: Car,
};

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getUniqueModes(route: Route): string[] {
  const seen = new Set<string>();
  return route.segments
    .map((s) => s.mode)
    .filter((m) => {
      if (seen.has(m)) return false;
      seen.add(m);
      return true;
    });
}

function getBadge(route: Route, index: number): { label: string; green: boolean } | null {
  if (route.totalCarbon === 0) return { label: "Zéro carbone", green: true };
  if (index === 0) return { label: "Recommandé", green: false };
  return null;
}

interface Props {
  routes: Route[];
  loading: boolean;
  originLabel: string;
  destLabel: string;
  onBack: () => void;
  onStart: () => void;
  onSelectRoute: (index: number) => void;
  selectedIndex: number;
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
}: Props) {
  const {
    dragY, dragging,
    onTouchStart, onTouchMove, onTouchEnd,
    onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
  } = useBottomSheetDrag({ onDismiss: onBack });

  const minDuration = routes.length > 0
    ? formatDuration(Math.min(...routes.map((r) => r.totalDuration)))
    : "";

  return (
    <>
      <div className="absolute inset-0 z-10" onClick={onBack} />

      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 flex items-center gap-2.5">
        <button
          onClick={onBack}
          className="w-[42px] h-[42px] rounded-xl bg-white shadow-lg flex items-center justify-center shrink-0"
        >
          <ArrowLeft size={18} className="text-uf-text" />
        </button>
        <div className="flex-1 bg-white rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-uf-success shrink-0" />
          <span className="text-[13px] text-uf-text-secondary truncate">{originLabel}</span>
          <ArrowRight size={13} className="text-uf-text-secondary shrink-0" />
          <span className="text-[13px] font-semibold text-uf-text truncate">{destLabel}</span>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 280ms cubic-bezier(0.32,0.72,0,1)",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <div className="flex justify-center py-3">
          <div className="w-9 h-1 rounded-full bg-uf-border" />
        </div>

        <div className="px-4 pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={28} className="text-uf-red animate-spin" />
              <p className="text-sm text-uf-text-secondary">Calcul des itinéraires…</p>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-uf-text-secondary">Aucun itinéraire trouvé</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-3">
                <p className="text-[15px] font-bold text-uf-text">
                  {routes.length} itinéraire{routes.length > 1 ? "s" : ""} trouvé{routes.length > 1 ? "s" : ""}
                </p>
                <span className="text-xs text-uf-text-secondary">À partir de {minDuration}</span>
              </div>

              <div className="flex flex-col gap-2">
                {routes.map((route, i) => {
                  const isSelected = selectedIndex === i;
                  const modes = getUniqueModes(route);
                  const badge = getBadge(route, i);

                  return (
                    <div
                      key={i}
                      onClick={() => onSelectRoute(i)}
                      className={`rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                        isSelected ? "border-uf-red bg-uf-red-light" : "border-uf-border bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          {modes.map((m, j) => {
                            const Icon = MODE_ICONS[m] ?? Footprints;
                            return (
                              <span key={j} className="flex items-center gap-1.5">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-white" : "bg-uf-bg"}`}>
                                  <Icon size={14} className={isSelected ? "text-uf-red" : "text-uf-text-secondary"} />
                                </span>
                                {j < modes.length - 1 && (
                                  <ChevronRight size={10} className="text-uf-border" />
                                )}
                              </span>
                            );
                          })}
                        </div>
                        {badge && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            badge.green ? "bg-green-50 text-uf-success" : "bg-uf-red text-white"
                          }`}>
                            {badge.label}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-[20px] font-bold text-uf-text">
                            {formatDuration(route.totalDuration)}
                          </span>
                          <span className="text-xs text-uf-text-secondary">
                            {formatDistance(route.totalDistance)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Leaf size={12} className={route.totalCarbon === 0 ? "text-uf-success" : "text-uf-text-secondary"} />
                          <span className={`text-[11px] font-mono ${route.totalCarbon === 0 ? "text-uf-success" : "text-uf-text-secondary"}`}>
                            {Math.round(route.totalCarbon)} gCO₂
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <button
                          onClick={onStart}
                          className="mt-2.5 w-full bg-uf-red text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
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
