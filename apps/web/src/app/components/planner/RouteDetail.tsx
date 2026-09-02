"use client";

import { ArrowRight, Navigation } from "lucide-react";
import type { TripRoute, TripSegment } from "@/app/services/trips.service";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { useFocusOnMount } from "@/app/hooks/useFocusOnMount";

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h${rest}` : `${hours}h`;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

interface Props {
  route: TripRoute;
  originLabel: string;
  destLabel: string;
  onGo: () => void;
  onBack: () => void;
}

export function RouteDetail({ route, originLabel, destLabel, onGo, onBack }: Props) {
  const panelRef = useFocusOnMount<HTMLDivElement>();
  useEscapeKey(onBack);

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Détail de l'itinéraire"
      tabIndex={-1}
      className="absolute bottom-0 left-0 right-0 z-20 bg-surface rounded-t-[18px] shadow-2xl px-4 pt-3 pb-8 max-h-[80%] flex flex-col"
    >
      <div className="w-9 h-1 rounded-full bg-border mx-auto mb-3.5 shrink-0" />

      <div className="flex items-center gap-2 mb-3 shrink-0 min-w-0">
        <span className="text-[13px] text-text-2 truncate">{originLabel}</span>
        <ArrowRight size={13} className="text-text-2 shrink-0" />
        <span className="text-[13px] font-semibold text-ink truncate">{destLabel}</span>
      </div>

      <div className="mb-3.5 shrink-0">
        <p className="num text-2xl font-bold text-ink">{formatDuration(route.totalDurationSeconds)}</p>
        <p className="num text-xs text-text-2">
          {formatDistance(route.totalDistanceMeters)} · {Math.round(route.totalCarbonGrams)} gCO₂
        </p>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto mb-4">
        {route.segments.map((segment, index) => (
          <SegmentRow key={index} segment={segment} />
        ))}
      </div>

      <div className="flex gap-2.5 shrink-0">
        <button onClick={onBack} className="flex-1 border border-ink rounded-xl py-3 text-sm font-bold text-ink">
          Autre moyen
        </button>
        <button
          onClick={onGo}
          className="flex-[1.4] bg-primary text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#B8132C] transition-colors"
        >
          <Navigation size={16} />
          Go
        </button>
      </div>
    </div>
  );
}

function SegmentRow({ segment }: { segment: TripSegment }) {
  const meta = MODE_META[segment.mode] ?? MODE_FALLBACK;
  const Icon = meta.icon;
  const isTransit = segment.mode === "tram" || segment.mode === "bus";
  const stopsCount = segment.intermediateStops ? segment.intermediateStops.length + 1 : null;
  const hasStops = isTransit && segment.departureStopName && segment.arrivalStopName;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 bg-bg rounded-xl">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.color }}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-ink">{meta.label}</span>
          {isTransit && segment.lineShortName && (
            <span
              className="num text-[11px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
              style={{
                background: segment.lineColor ?? meta.color,
                color: segment.lineTextColor ?? "#FFFFFF",
              }}
            >
              {segment.lineShortName}
            </span>
          )}
        </div>
        {hasStops ? (
          <p className="text-xs text-text-2 truncate">
            {segment.departureStopName} → {segment.arrivalStopName}
            {stopsCount ? ` · ${stopsCount} arrêts` : ""}
          </p>
        ) : (
          <p className="num text-xs text-text-2">
            {formatDistance(segment.distanceMeters)} · {formatDuration(segment.durationSeconds)}
          </p>
        )}
      </div>
    </div>
  );
}
