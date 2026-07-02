"use client";

import { ArrowLeft, ArrowRight, ChevronRight, Bike, Bus, Footprints, Train, Leaf, Navigation, Car, Loader2 } from "lucide-react";
import { useBottomSheetDrag } from "@/app/hooks/useBottomSheetDrag";
import type { TripRoute } from "@/app/services/trips.service";

const MODE_ICONS: Record<string, React.ElementType> = {
  walk: Footprints,
  tram: Train,
  bus: Bus,
  bike: Bike,
  carpool: Car,
};

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

function getUniqueModes(route: TripRoute): string[] {
  const seen = new Set<string>();
  return route.segments
    .map((segment) => segment.mode)
    .filter((mode) => {
      if (seen.has(mode)) return false;
      seen.add(mode);
      return true;
    });
}

function getBadge(route: TripRoute, index: number): { label: string; green: boolean } | null {
  if (route.totalCarbonGrams === 0) return { label: "Zéro carbone", green: true };
  if (index === 0) return { label: "Recommandé", green: false };
  return null;
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
    ? formatDuration(Math.min(...routes.map((route) => route.totalDurationSeconds)))
    : "";

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 flex items-center gap-2.5">
        <button
          onClick={onBack}
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
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

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
              <div className="flex justify-between items-center mb-3">
                <p className="text-[15px] font-bold text-ink">
                  {routes.length} itinéraire{routes.length > 1 ? "s" : ""} trouvé{routes.length > 1 ? "s" : ""}
                </p>
                <span className="text-xs text-text-2">À partir de {minDuration}</span>
              </div>

              <div className="flex flex-col gap-2">
                {routes.map((route, index) => {
                  const isSelected = selectedIndex === index;
                  const modes = getUniqueModes(route);
                  const badge = getBadge(route, index);

                  return (
                    <div
                      key={index}
                      onClick={() => onSelectRoute(index)}
                      className={`rounded-xl border-2 p-3 cursor-pointer transition-colors ${
                        isSelected ? "border-primary bg-primary-tint" : "border-border bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          {modes.map((mode, modeIndex) => {
                            const Icon = MODE_ICONS[mode] ?? Footprints;
                            return (
                              <span key={modeIndex} className="flex items-center gap-1.5">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-white" : "bg-bg"}`}>
                                  <Icon size={14} className={isSelected ? "text-primary" : "text-text-2"} />
                                </span>
                                {modeIndex < modes.length - 1 && (
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
                        <div className="flex items-baseline gap-1.5">
                          <span className="num text-[20px] font-bold text-ink">
                            {formatDuration(route.totalDurationSeconds)}
                          </span>
                          <span className="text-xs text-text-2">
                            {formatDistance(route.totalDistanceMeters)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Leaf size={12} className={route.totalCarbonGrams === 0 ? "text-eco" : "text-text-2"} />
                          <span className={`text-[11px] num ${route.totalCarbonGrams === 0 ? "text-eco" : "text-text-2"}`}>
                            {Math.round(route.totalCarbonGrams)} gCO₂
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <button
                          onClick={onStart}
                          className="mt-2.5 w-full bg-primary text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
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