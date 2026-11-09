"use client";

import { MapPin, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { Coordinates } from "@urbanflow/app-front-back-lib";
import { Button } from "@/app/components/ui/Button";
import { LinePlate } from "@/app/components/ui/LinePlate";
import type { UserLocation } from "@/app/hooks/useUserLocation";
import { formatDistance } from "@/app/lib/format";
import { walkingMinutes } from "@/app/lib/home";
import { MODE_FALLBACK, MODE_META } from "@/app/lib/mode-meta";
import { transportService, type TransitStop } from "@/app/services/transport.service";
import { StopDepartures } from "./StopDepartures";

/** Chaque arrêt avec horaires coûte des appels SIRI tant que l'app est visible : dans un centre-ville, on plafonne. */
const MAX_STOPS_WITH_DEPARTURES = 4;

interface HomePanelProps {
  /** Bloc affiché en tête quand il a quelque chose d'utile à dire (le dernier départ du soir). */
  header?: ReactNode;
  location: UserLocation;
  onPlanTrip: () => void;
  onRequestPosition: () => void;
  onStopsLoaded: (stops: TransitStop[]) => void;
}

/** Accueil : le bloc utile du moment, la recherche, puis les arrêts autour de soi : chaque ligne et chaque sens, une seule fois. */
export function HomePanel({ header, location, onPlanTrip, onRequestPosition, onStopsLoaded }: HomePanelProps) {
  const position = location.state === "located" ? location.position : null;
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!position) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement déclenché par la position (système externe)
    setLoading(true);
    void transportService.getNearby({ latitude: position.latitude, longitude: position.longitude }).then((result) => {
      if (!active) return;
      setLoading(false);
      if (!result.isOk) {
        setError(result.error);
        return;
      }
      setError(null);
      const { transitStops, listedStopIds } = result.data;
      setStops(listedStopIds.flatMap((stopId) => transitStops.filter((stop) => stop.id === stopId)));
      onStopsLoaded(transitStops);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on recharge sur un changement de position, pas de callback
  }, [position?.latitude, position?.longitude]);

  return (
    <div className="flex flex-col gap-5">
      {header}
      <button type="button" onClick={onPlanTrip} className="uf-inset flex min-h-[60px] items-center gap-3 rounded-uf-panel px-5 text-left">
        <Search size={20} strokeWidth={2.2} aria-hidden="true" />
        <span className="flex flex-col">
          <span className="[font:var(--uf-note)] font-bold">Où vas-tu ?</span>
          <span className="[font:var(--uf-body)] text-uf-ink-2">Une adresse, un arrêt</span>
        </span>
      </button>

      <section aria-labelledby="autour-de-toi" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="autour-de-toi" className="[font:var(--uf-time)]">Autour de toi</h2>
          {position && (
            <span className="[font:var(--uf-note)] text-uf-ink-2" aria-live="polite">
              {loading ? "Recherche…" : `${stops.length} arrêt${stops.length > 1 ? "s" : ""}`}
            </span>
          )}
        </div>

        {!position && (
          <Button variant="inset" onClick={onRequestPosition} className="self-start">
            <MapPin size={16} aria-hidden="true" />
            {location.state === "locating" ? "Localisation…" : "Voir les arrêts autour de moi"}
          </Button>
        )}

        {error && <p role="alert" className="[font:var(--uf-body)]">Les arrêts proches sont indisponibles pour le moment.</p>}

        {position && !loading && !error && stops.length === 0 && (
          <p className="[font:var(--uf-body)] text-uf-ink-2">Aucun arrêt à moins de 400 m.</p>
        )}

        <ul className="flex flex-col gap-2">
          {stops.map((stop, index) => (
            <NearbyStopCard key={stop.id} stop={stop} departuresFrom={index < MAX_STOPS_WITH_DEPARTURES ? position : null} />
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Un arrêt proche et ses lignes. Avec `departuresFrom`, il donne aussi son temps de marche et ses horaires. */
function NearbyStopCard({ stop, departuresFrom }: { stop: TransitStop; departuresFrom: Coordinates | null }) {
  return (
    <li className="uf-inset flex flex-col gap-3 rounded-uf-inset px-4 py-3">
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate [font:var(--uf-body)] font-bold">{stop.name}</span>
          <span className="flex flex-wrap gap-1.5">
            {stop.lines.map((line) => {
              const meta = MODE_META[line.mode] ?? MODE_FALLBACK;
              return <LinePlate key={line.lineId ?? line.code} code={line.code} color={line.color ?? meta.color} label={`${meta.label} ${line.code}`} size="s" />;
            })}
          </span>
        </span>
        <span className="shrink-0 [font:var(--uf-note)] tabular-nums text-uf-ink-2">
          {departuresFrom ? `à ${walkingMinutes(stop.distanceMeters)} min à pied` : formatDistance(stop.distanceMeters)}
        </span>
      </span>
      {departuresFrom && <StopDepartures stopId={stop.id} position={departuresFrom} />}
    </li>
  );
}
