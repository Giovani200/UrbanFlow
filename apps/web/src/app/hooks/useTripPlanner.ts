"use client";

import { useRef, useState } from "react";
import type { PlannedTime, RecordTripDtoIn, RoutingProfile } from "@urbanflow/app-front-back-lib";
import type { GeocodingResult } from "@/app/hooks/useGeocoding";
import { addLocalTrip, toTripRecord } from "@/app/lib/localTrips";
import { orderedRoutes, transitMessage } from "@/app/lib/trip-results";
import { tripsService, type TripRoute } from "@/app/services/trips.service";

export type PlannerView = "home" | "search" | "results" | "detail" | "navigation" | "arrival";
type Place = RecordTripDtoIn["origin"];

/** État et actions du parcours : recherche, choix d'un itinéraire, navigation, enregistrement du trajet fait. */
export function useTripPlanner({ profile, isAuthenticated }: { profile?: RoutingProfile; isAuthenticated: boolean }) {
  const [view, setView] = useState<PlannerView>("home");
  const [routes, setRoutes] = useState<TripRoute[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const recordedRef = useRef(false);

  async function search(from: GeocodingResult, to: GeocodingResult, plannedTime?: PlannedTime): Promise<TripRoute | null> {
    setOrigin(from);
    setDestination(to);
    setRoutes([]);
    setSelectedIndex(0);
    setNotice(null);
    setFailed(false);
    setLoading(true);
    setView("results");
    recordedRef.current = false;

    const result = await tripsService.planTrip({
      origin: { latitude: from.latitude, longitude: from.longitude },
      destination: { latitude: to.latitude, longitude: to.longitude },
      profile,
      plannedTime,
    });
    setLoading(false);

    if (!result.isOk) {
      setFailed(true);
      return null;
    }
    const nextRoutes = orderedRoutes(result.data);
    setRoutes(nextRoutes);
    setNotice(transitMessage(result.data));
    return nextRoutes[0] ?? null;
  }

  /** Le trajet fait est enregistré une seule fois : sur le serveur si connecté, sinon en local. */
  function recordTrip() {
    const route = routes[selectedIndex];
    if (recordedRef.current || !route || !origin || !destination) return;
    recordedRef.current = true;
    const input: RecordTripDtoIn = { origin, destination, route };
    if (isAuthenticated) void tripsService.recordTrip(input);
    else addLocalTrip(toTripRecord(input));
  }

  function reset() {
    setRoutes([]);
    setNotice(null);
    setFailed(false);
    setView("home");
  }

  return {
    view,
    setView,
    routes,
    selectedRoute: routes[selectedIndex] ?? null,
    selectedIndex,
    selectRoute: setSelectedIndex,
    loading,
    failed,
    notice,
    origin,
    destination,
    search,
    recordTrip,
    reset,
  };
}
