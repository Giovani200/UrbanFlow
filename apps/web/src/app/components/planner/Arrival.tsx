"use client";

import { Check, Home } from "lucide-react";
import type { TripRoute } from "@/app/services/trips.service";

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
  onDone: () => void;
}

export function Arrival({ route, onDone }: Props) {
  return (
    <div className="absolute inset-0 z-30 bg-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-eco flex items-center justify-center mb-5">
        <Check size={34} className="text-white" strokeWidth={3} />
      </div>
      <p className="font-display text-2xl font-semibold text-ink">Arrivé à destination</p>
      <p className="num text-sm text-text-2 mt-2">
        {formatDuration(route.totalDurationSeconds)} · {formatDistance(route.totalDistanceMeters)} ·{" "}
        {Math.round(route.totalCarbonGrams)} gCO₂
      </p>

      <button
        onClick={onDone}
        className="mt-8 bg-primary text-white rounded-xl py-3 px-6 font-bold text-sm flex items-center gap-2 hover:bg-[#B8132C] transition-colors"
      >
        <Home size={16} />
        Retour à l'accueil
      </button>
    </div>
  );
}
