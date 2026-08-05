"use client";

import { useEffect, useState } from "react";
import { Bus, MapPin, Navigation, TrainFront } from "lucide-react";
import { useFocusOnMount } from "@/app/hooks/useFocusOnMount";
import { transportService } from "@/app/services/transport.service";
import type { SharedVehicle, TransitStop } from "@/app/services/transport.service";
import type { UserLocation } from "@/app/hooks/useUserLocation";

const MODE_COLOR: Record<string, string> = {
  tram: "#2F62E6",
  bus: "#E07A1F",
};

interface Props {
  location: UserLocation;
  onPlanTrip: () => void;
  onRequestPosition: () => void;
  onLoaded?: (stops: TransitStop[], vehicles: SharedVehicle[]) => void;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
}

function summariseVehicles(vehicles: SharedVehicle[]): string | null {
  if (vehicles.length === 0) return null;
  const bikes = vehicles.filter((vehicle) => vehicle.type === "bike").length;
  const scooters = vehicles.filter((vehicle) => vehicle.type === "scooter").length;
  const parts: string[] = [];
  if (scooters > 0) parts.push(`${scooters} trottinette${scooters > 1 ? "s" : ""}`);
  if (bikes > 0) parts.push(`${bikes} vélo${bikes > 1 ? "s" : ""}`);
  return `${parts.join(" et ")} en libre-service`;
}

export function NearbyDrawer({ location, onPlanTrip, onRequestPosition, onLoaded }: Props) {
  const panelRef = useFocusOnMount<HTMLDivElement>();
  const position = location.state === "located" ? location.position : null;
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [vehicles, setVehicles] = useState<SharedVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;
    let active = true;

    transportService
      .getNearby({ latitude: position.latitude, longitude: position.longitude })
      .then((result) => {
        if (!active) return;
        if (result.isOk) {
          const nextStops = result.data.transitStops ?? [];
          const nextVehicles = result.data.sharedVehicles ?? [];
          setStops(nextStops);
          setVehicles(nextVehicles);
          setError(null);
          onLoaded?.(nextStops, nextVehicles);
        } else {
          setError(result.error);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [position]);

  const vehiclesSummary = summariseVehicles(vehicles);

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Transports à proximité"
      tabIndex={-1}
      className="absolute bottom-0 left-0 right-0 z-20 bg-surface rounded-t-[18px] shadow-2xl pb-7"
    >
      <div className="flex justify-center py-3">
        <div className="w-9 h-1 rounded-full bg-border" />
      </div>

      <div className="px-4">
        <div className="mb-3.5">
          <h2 className="text-base font-bold text-ink">À proximité</h2>
          {location.state === "located" && (
            <p className="text-xs text-text-2 mt-0.5" aria-live="polite">
              {loading ? "Recherche…" : `${stops.length} arrêt${stops.length > 1 ? "s" : ""} autour de vous`}
            </p>
          )}
          {location.state === "locating" && (
            <p className="text-xs text-text-2 mt-0.5" aria-live="polite">
              Localisation en cours…
            </p>
          )}
        </div>

        {(location.state === "idle" || location.state === "asking") && (
          <button
            onClick={onRequestPosition}
            className="w-full flex items-center gap-3 px-3 py-3 bg-bg rounded-xl text-left mb-3.5"
          >
            <MapPin size={18} className="text-primary shrink-0" />
            <span className="text-sm text-text-2">
              Activez la localisation pour voir les transports autour de vous
            </span>
          </button>
        )}

        {error && <p role="alert" className="text-sm text-primary mb-3.5">{error}</p>}

        {location.state === "located" && (
          <div className="flex flex-col gap-2 mb-3.5 max-h-64 overflow-y-auto">
            {stops.map((stop) => (
              <div key={stop.id} className="flex items-center gap-3 px-3 py-2.5 bg-bg rounded-xl">
                <StopIcon stop={stop} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{stop.name}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {stop.lines.map((line) => (
                      <span
                        key={line.code}
                        className="num text-[11px] font-bold text-white px-1.5 py-0.5 rounded-md"
                        style={{ background: MODE_COLOR[line.mode] }}
                      >
                        {line.code}
                      </span>
                    ))}
                    <span className="num text-xs text-text-2">{formatDistance(stop.distanceMeters)}</span>
                  </div>
                </div>
              </div>
            ))}

            {!loading && stops.length === 0 && (
              <p className="text-sm text-text-2 px-1">Aucun arrêt à proximité.</p>
            )}

            {vehiclesSummary && <p className="num text-xs text-text-2 px-1">{vehiclesSummary}</p>}
          </div>
        )}

        <button
          onClick={onPlanTrip}
          className="w-full bg-primary text-white rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#B8132C] transition-colors"
        >
          <Navigation size={16} />
          Planifier un trajet
        </button>
      </div>
    </div>
  );
}

function StopIcon({ stop }: { stop: TransitStop }) {
  const mode = stop.lines[0]?.mode ?? "bus";
  const color = MODE_COLOR[mode] ?? "#5A6470";
  const Icon = mode === "tram" ? TrainFront : Bus;
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color }}>
      <Icon size={18} className="text-white" />
    </div>
  );
}
