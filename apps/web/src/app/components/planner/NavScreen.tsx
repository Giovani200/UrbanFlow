"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Navigation, Square } from "lucide-react";
import type { TripRoute, TripSegment } from "@/app/services/trips.service";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { haversineMeters } from "@/app/lib/geo";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { useFocusOnMount } from "@/app/hooks/useFocusOnMount";

const ADVANCE_THRESHOLD_METERS = 30;
const SWIPE_THRESHOLD_PIXELS = 50;

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

function segmentEnd(segment: TripSegment): { latitude: number; longitude: number } | null {
  const coordinates = segment.geometry.coordinates;
  const last = coordinates[coordinates.length - 1];
  return last ? { longitude: last[0], latitude: last[1] } : null;
}

interface Props {
  route: TripRoute;
  position: { latitude: number; longitude: number } | null;
  onFocusSegment: (segment: TripSegment) => void;
  onRecenter: () => void;
  onExit: () => void;
  onArrived: () => void;
}

export function NavScreen({ route, position, onFocusSegment, onRecenter, onExit, onArrived }: Props) {
  const panelRef = useFocusOnMount<HTMLDivElement>();
  useEscapeKey(onExit);

  const [activeIndex, setActiveIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const segments = route.segments;
  const active = segments[activeIndex];
  const isLast = activeIndex >= segments.length - 1;
  const meta = MODE_META[active.mode] ?? MODE_FALLBACK;
  const Icon = meta.icon;
  const isTransit = active.mode === "tram" || active.mode === "bus";

  // Cadre la carte sur le segment actif à chaque changement.
  useEffect(() => {
    onFocusSegment(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Bascule automatique au segment suivant quand la position atteint la fin du segment.
  useEffect(() => {
    if (!position) return;
    const current = segments[activeIndex];
    const currentEnd = segmentEnd(current);
    if (!currentEnd || haversineMeters(position, currentEnd) >= ADVANCE_THRESHOLD_METERS) return;
    if (activeIndex >= segments.length - 1) onArrived();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- avancement piloté par le GPS (système externe), cas légitime selon la doc React
    else setActiveIndex((index) => index + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, activeIndex, segments]);

  function handleSwipeStart(clientX: number) {
    swipeStartX.current = clientX;
  }

  function handleSwipeEnd(clientX: number) {
    if (swipeStartX.current === null) return;
    const delta = clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (delta < -SWIPE_THRESHOLD_PIXELS && !isLast) setActiveIndex((index) => index + 1);
    else if (delta > SWIPE_THRESHOLD_PIXELS && activeIndex > 0) setActiveIndex((index) => index - 1);
  }

  const end = segmentEnd(active);
  const remaining = position && end ? Math.round(haversineMeters(position, end)) : active.distanceMeters;

  return (
    <>
      <button
        title="Recentrer"
        aria-label="Recentrer la carte"
        onClick={onRecenter}
        className="absolute right-4 bottom-[300px] z-10 w-11 h-11 rounded-xl bg-surface shadow-lg flex items-center justify-center"
      >
        <Navigation size={18} className="text-ink" />
      </button>

      <div
        ref={panelRef}
        role="region"
        aria-label="Navigation en cours"
        tabIndex={-1}
        className="absolute bottom-0 left-0 right-0 z-20 bg-surface rounded-t-[18px] shadow-2xl px-4 pt-3 pb-8 max-h-[75%] flex flex-col"
        onTouchStart={(event) => handleSwipeStart(event.touches[0].clientX)}
        onTouchEnd={(event) => handleSwipeEnd(event.changedTouches[0].clientX)}
      >
        <div className="w-9 h-1 rounded-full bg-border mx-auto mb-3.5 shrink-0" />

        <div className="flex items-center gap-3.5 mb-3.5 shrink-0">
          <div
            className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0"
            style={{ background: meta.color }}
          >
            <Icon size={26} className="text-white" strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-text-2">
              Étape {activeIndex + 1} / {segments.length}
            </p>
            <p className="text-base font-bold text-ink leading-tight truncate">
              {meta.label}
              {isTransit && active.lineShortName ? ` ${active.lineShortName}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="num text-lg font-bold text-ink">{formatDistance(remaining)}</p>
            <p className="text-[11px] text-text-2">restant</p>
          </div>
        </div>

        <div className="overflow-y-auto mb-3.5">
          {isTransit && active.departureStopName ? (
            <StopList segment={active} />
          ) : (
            <div className="px-3 py-2.5 bg-bg rounded-xl">
              <p className="num text-sm text-text-2">
                {formatDistance(active.distanceMeters)} · {formatDuration(active.durationSeconds)}
              </p>
              <p className="text-sm text-ink mt-0.5">Suivez le tracé {meta.label.toLowerCase()} sur la carte.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 mb-3 shrink-0">
          <button
            onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
            disabled={activeIndex === 0}
            className="w-11 h-11 rounded-xl border border-border flex items-center justify-center disabled:opacity-40"
          >
            <ChevronLeft size={18} className="text-ink" />
          </button>
          {isLast ? (
            <button
              onClick={onArrived}
              className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-bold flex items-center justify-center"
            >
              Je suis arrivé
            </button>
          ) : (
            <button
              onClick={() => setActiveIndex((index) => index + 1)}
              className="flex-1 h-11 rounded-xl bg-ink text-white text-sm font-bold flex items-center justify-center gap-1.5"
            >
              Segment suivant <ChevronRight size={16} />
            </button>
          )}
        </div>

        <button
          onClick={onExit}
          className="w-full border border-border rounded-xl py-3 text-sm font-medium text-text-2 flex items-center justify-center gap-1.5 shrink-0"
        >
          <Square size={14} className="text-text-2" />
          Arrêter la navigation
        </button>
      </div>
    </>
  );
}

function StopList({ segment }: { segment: TripSegment }) {
  const stops = [
    segment.departureStopName,
    ...(segment.intermediateStops?.map((stop) => stop.name) ?? []),
    segment.arrivalStopName,
  ].filter((name): name is string => Boolean(name));

  return (
    <div className="flex flex-col">
      {stops.map((name, index) => {
        const isBoarding = index === 0;
        const isTerminus = index === stops.length - 1;
        const endpoint = isBoarding || isTerminus;
        return (
          <div key={index} className="grid grid-cols-[16px_1fr] items-center gap-2.5 min-h-[28px]">
            <span
              className="justify-self-center w-2.5 h-2.5 rounded-full border-2 border-white"
              style={{ background: endpoint ? "#15171C" : "#2F62E6", boxShadow: "0 0 0 1.5px #E4E1DA" }}
            />
            <span className={`truncate text-sm ${endpoint ? "font-bold text-ink" : "text-text-2"}`}>{name}</span>
          </div>
        );
      })}
    </div>
  );
}
