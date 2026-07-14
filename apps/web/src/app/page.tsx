"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LocateFixed, Search, Settings } from "lucide-react";
import { MapViewDynamic } from "@/app/components/map/MapViewDynamic";
import type { MapViewHandle } from "@/app/components/map/MapView";
import { NearbyDrawer } from "@/app/components/planner/NearbyDrawer";
import { SearchDrawer } from "@/app/components/planner/SearchDrawer";
import { ResultsDrawer } from "@/app/components/planner/ResultsDrawer";
import { NavScreen } from "@/app/components/planner/NavScreen";
import { RouteDetail } from "@/app/components/planner/RouteDetail";
import { Arrival } from "@/app/components/planner/Arrival";
import { SettingsDrawer } from "@/app/components/settings/SettingsDrawer";
import type { GeocodingResult } from "@/app/hooks/useGeocoding";
import { useGeolocation } from "@/app/hooks/useGeolocation";
import { useGeolocationConsent } from "@/app/hooks/useGeolocationConsent";
import { GeolocationConsentDialog } from "@/app/components/map/GeolocationConsentDialog";
import { GeolocationErrorDialog } from "@/app/components/map/GeolocationErrorDialog";
import { tripsService } from "@/app/services/trips.service";
import type { TripRoute } from "@/app/services/trips.service";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { addLocalTrip, toTripRecord } from "@/app/lib/localTrips";
import type { RecordTripDtoIn } from "@urbanflow/app-front-back-lib";

type View = "home" | "search" | "results" | "detail" | "navigation" | "arrival";

export default function PlannerPage() {
  const [view, setView] = useState<View>("home");
  const [routes, setRoutes] = useState<TripRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [originLabel, setOriginLabel] = useState("");
  const [destLabel, setDestLabel] = useState("");
  const [originPoint, setOriginPoint] = useState<RecordTripDtoIn["origin"] | null>(null);
  const [destPoint, setDestPoint] = useState<RecordTripDtoIn["destination"] | null>(null);

  const mapRef = useRef<MapViewHandle>(null);
  const { status: authStatus } = useAuth();
  const hasRecordedRef = useRef(false);

  const { status, position, start, stop } = useGeolocation();
  const { consent, grant, deny } = useGeolocationConsent();
  const [showConsent, setShowConsent] = useState(false);
  const [geoError, setGeoError] = useState<"denied" | "unavailable" | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const recenterPendingRef = useRef(false);

  // Position utilisateur → marqueur sur la carte (+ recentrage si demandé).
  useEffect(() => {
    if (!position) return;
    mapRef.current?.setUserPosition(position.latitude, position.longitude);
    if (recenterPendingRef.current) {
      mapRef.current?.recenterOnUser(position.latitude, position.longitude);
      recenterPendingRef.current = false;
    }
  }, [position]);

  useEffect(() => {
    if (status === "denied" || status === "unavailable") setGeoError(status);
  }, [status]);

  function startTracking() {
    recenterPendingRef.current = true;
    start();
  }

  function handleLocateClick() {
    if (status === "watching" && position) {
      mapRef.current?.recenterOnUser(position.latitude, position.longitude);
      return;
    }
    if (status === "denied") {
      setGeoError("denied");
      return;
    }
    if (consent === "granted") {
      startTracking();
      return;
    }
    setShowConsent(true);
  }

  function handleConsentAccept() {
    grant();
    setShowConsent(false);
    startTracking();
  }

  function handleConsentRefuse() {
    deny();
    setShowConsent(false);
    stop();
  }

  async function handleSearch(origin: GeocodingResult, destination: GeocodingResult) {
    setOriginLabel(origin.label);
    setDestLabel(destination.label);
    setOriginPoint({ latitude: origin.latitude, longitude: origin.longitude, label: origin.label });
    setDestPoint({ latitude: destination.latitude, longitude: destination.longitude, label: destination.label });
    hasRecordedRef.current = false;
    setView("results");
    setLoading(true);
    setRoutes([]);
    setSelectedRoute(0);
    mapRef.current?.setNearbyMarkers([], []);

    const result = await tripsService.planTrip({
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: { latitude: destination.latitude, longitude: destination.longitude },
    });

    setLoading(false);
    if (!result.isOk) return;

    // Nouveau DTO : modes purs (walk, bike) + combinaisons transit classées.
    const { walk, bike, transit } = result.data;
    const combined = [...transit, ...(bike ? [bike] : []), ...(walk ? [walk] : [])];
    setRoutes(combined);

    const first = combined[0];
    if (first) {
      mapRef.current?.drawSegments(first.segments);
      mapRef.current?.fitToSegments(first.segments);
    }
  }

  function handleSelectRoute(index: number) {
    setSelectedRoute(index);
    const route = routes[index];
    if (route) {
      mapRef.current?.drawSegments(route.segments);
      mapRef.current?.fitToSegments(route.segments);
    }
  }

  function handleBack() {
    mapRef.current?.clearSegments();
    setRoutes([]);
    setView("home");
  }

  // Trajet fait (arrivée) → enregistré une fois : serveur si connecté, local (plafonné) sinon.
  function recordCurrentTrip() {
    if (hasRecordedRef.current) return;
    const route = routes[selectedRoute];
    if (!route || !originPoint || !destPoint) return;
    hasRecordedRef.current = true;
    const input: RecordTripDtoIn = { origin: originPoint, destination: destPoint, route };
    if (authStatus === "authenticated") void tripsService.recordTrip(input);
    else addLocalTrip(toTripRecord(input));
  }

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      <div className="absolute inset-0">
        <MapViewDynamic ref={mapRef} />
      </div>

      {view === "home" && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12 flex items-start gap-2.5">
          <button
            onClick={() => setView("search")}
            className="flex-1 bg-surface rounded-xl shadow-lg flex items-center gap-2.5 px-3.5 py-3 text-left"
          >
            <Search size={16} className="text-ink shrink-0" />
            <span className="text-sm text-text-2">Où allez-vous ?</span>
          </button>
          <button
            title="Ma position"
            onClick={handleLocateClick}
            className="w-11 h-11 rounded-xl bg-surface shadow-lg flex items-center justify-center shrink-0"
          >
            <LocateFixed size={19} className="text-ink" />
          </button>
          <button
            title="Paramètres"
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 rounded-xl bg-surface shadow-lg flex items-center justify-center shrink-0"
          >
            <Settings size={19} className="text-ink" />
          </button>
        </div>
      )}

      {view === "search" && (
        <button
          title="Retour"
          onClick={() => setView("home")}
          className="absolute top-12 left-4 z-30 w-11 h-11 rounded-xl bg-surface shadow-lg flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-ink" />
        </button>
      )}

      {view === "home" && (
        <NearbyDrawer
          position={position}
          onPlanTrip={() => setView("search")}
          onRequestPosition={handleLocateClick}
          onLoaded={(stops, vehicles) => mapRef.current?.setNearbyMarkers(stops, vehicles)}
        />
      )}

      {view === "search" && (
        <SearchDrawer onSearch={handleSearch} userPosition={position} onRequestPosition={handleLocateClick} />
      )}

      {view === "results" && (
        <ResultsDrawer
          routes={routes}
          loading={loading}
          originLabel={originLabel}
          destLabel={destLabel}
          onBack={handleBack}
          onStart={() => setView("detail")}
          onSelectRoute={handleSelectRoute}
          selectedIndex={selectedRoute}
        />
      )}

      {view === "detail" && routes[selectedRoute] && (
        <RouteDetail
          route={routes[selectedRoute]}
          originLabel={originLabel}
          destLabel={destLabel}
          onGo={() => setView("navigation")}
          onBack={() => setView("results")}
        />
      )}

      {view === "navigation" && routes[selectedRoute] && (
        <NavScreen
          route={routes[selectedRoute]}
          position={position}
          onFocusSegment={(segment) => mapRef.current?.fitToSegments([segment])}
          onRecenter={() => {
            if (position) mapRef.current?.recenterOnUser(position.latitude, position.longitude);
          }}
          onExit={() => {
            mapRef.current?.clearSegments();
            setView("home");
          }}
          onArrived={() => {
            recordCurrentTrip();
            setView("arrival");
          }}
        />
      )}

      {view === "arrival" && routes[selectedRoute] && (
        <Arrival
          route={routes[selectedRoute]}
          onDone={() => {
            mapRef.current?.clearSegments();
            setView("home");
          }}
        />
      )}

      <GeolocationConsentDialog
        open={showConsent}
        onOpenChange={setShowConsent}
        onAccept={handleConsentAccept}
        onRefuse={handleConsentRefuse}
      />

      <GeolocationErrorDialog
        open={geoError !== null}
        onOpenChange={(open) => {
          if (!open) setGeoError(null);
        }}
        variant={geoError ?? "unavailable"}
      />

      {showSettings && <SettingsDrawer onClose={() => setShowSettings(false)} />}
    </div>
  );
}
