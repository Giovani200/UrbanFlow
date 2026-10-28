"use client";

import { LocateFixed, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlannedTime } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { GeolocationConsentDialog } from "@/app/components/map/GeolocationConsentDialog";
import { GeolocationErrorDialog } from "@/app/components/map/GeolocationErrorDialog";
import type { MapViewHandle } from "@/app/components/map/MapView";
import { MapViewDynamic } from "@/app/components/map/MapViewDynamic";
import { ArrivalPanel } from "@/app/components/planner/ArrivalPanel";
import { DetailPanel } from "@/app/components/planner/DetailPanel";
import { HomePanel } from "@/app/components/planner/HomePanel";
import { NavigationPanel } from "@/app/components/planner/NavigationPanel";
import { ResultsPanel } from "@/app/components/planner/ResultsPanel";
import { SearchPanel } from "@/app/components/planner/SearchPanel";
import { SettingsPanel } from "@/app/components/settings/SettingsPanel";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import type { GeocodingResult } from "@/app/hooks/useGeocoding";
import { useRoutingProfile } from "@/app/hooks/useRoutingProfile";
import { useTripPlanner, type PlannerView } from "@/app/hooks/useTripPlanner";
import { useUserLocation } from "@/app/hooks/useUserLocation";
import type { SheetPosition } from "@/app/lib/sheet-position";
import type { TransitStop } from "@/app/services/transport.service";
import type { TripRoute } from "@/app/services/trips.service";

const SHEET_POSITION_BY_VIEW: Record<PlannerView, SheetPosition> = {
  home: "half",
  search: "expanded",
  results: "half",
  detail: "half",
  navigation: "half",
  arrival: "half",
};

const SHEET_LABELS: Record<PlannerView, string> = {
  home: "Accueil",
  search: "Rechercher un trajet",
  results: "Trajets proposés",
  detail: "Détail du trajet",
  navigation: "Trajet en cours",
  arrival: "Arrivée",
};

const ROUND_GLASS_BUTTON = "uf-glass flex size-11 items-center justify-center rounded-full text-uf-ink";

export default function PlannerPage() {
  const mapRef = useRef<MapViewHandle>(null);
  const recenterPendingRef = useRef(false);
  const { status: authStatus } = useAuth();
  const profile = useRoutingProfile();
  const planner = useTripPlanner({ profile, isAuthenticated: authStatus === "authenticated" });
  const { location, failure, request, acceptConsent, refuseConsent, dismissAsking, dismissFailure } = useUserLocation();
  const [sheetPosition, setSheetPosition] = useState<SheetPosition>("half");
  const [showSettings, setShowSettings] = useState(false);
  const [nearbyStops, setNearbyStops] = useState<TransitStop[]>([]);
  const positionBeforeSettingsRef = useRef<SheetPosition>("half");

  const position = location.state === "located" ? location.position : null;
  const { view, selectedRoute } = planner;

  useEffect(() => {
    if (!position) return;
    if (recenterPendingRef.current) {
      mapRef.current?.recenterOnUser(position.latitude, position.longitude);
      recenterPendingRef.current = false;
    }
  }, [position]);

  function goTo(nextView: PlannerView) {
    planner.setView(nextView);
    setSheetPosition(SHEET_POSITION_BY_VIEW[nextView]);
  }

  function showRoute(route: TripRoute | null) {
    if (!route) return;
    mapRef.current?.drawSegments(route.segments);
    mapRef.current?.fitToSegments(route.segments);
  }

  function locate() {
    if (position) {
      mapRef.current?.recenterOnUser(position.latitude, position.longitude);
      return;
    }
    recenterPendingRef.current = true;
    request();
  }

  async function search(origin: GeocodingResult, destination: GeocodingResult, plannedTime?: PlannedTime) {
    setNearbyStops([]);
    setSheetPosition(SHEET_POSITION_BY_VIEW.results);
    showRoute(await planner.search(origin, destination, plannedTime));
  }

  function selectRoute(index: number) {
    planner.selectRoute(index);
    showRoute(planner.routes[index] ?? null);
  }

  function backToHome() {
    mapRef.current?.clearSegments();
    planner.reset();
    setSheetPosition(SHEET_POSITION_BY_VIEW.home);
  }

  function openSettings() {
    positionBeforeSettingsRef.current = sheetPosition;
    setShowSettings(true);
    setSheetPosition("half");
  }

  function closeSettings() {
    setShowSettings(false);
    setSheetPosition(positionBeforeSettingsRef.current);
  }

  const onHome = view === "home";

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <h1 className="sr-only">UrbanFlow, trajets en Île-de-France</h1>

      <div className="absolute inset-0">
        <MapViewDynamic ref={mapRef} userPosition={position} nearbyStops={nearbyStops} />
      </div>

      <div className="absolute top-[max(16px,env(safe-area-inset-top))] right-4 z-20 flex flex-col gap-2">
        <button type="button" aria-label="Me localiser" onClick={locate} className={ROUND_GLASS_BUTTON}>
          <LocateFixed size={20} aria-hidden="true" />
        </button>
        {onHome && (
          <button type="button" aria-label="Paramètres" aria-expanded={showSettings} onClick={showSettings ? closeSettings : openSettings} className={ROUND_GLASS_BUTTON}>
            <Settings size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      <BottomSheet
        label={showSettings ? "Paramètres" : SHEET_LABELS[view]}
        position={sheetPosition}
        onPositionChange={setSheetPosition}
      >
        {onHome && showSettings && <SettingsPanel onClose={closeSettings} />}

        {onHome && !showSettings && (
          <HomePanel
            location={location}
            onPlanTrip={() => goTo("search")}
            onRequestPosition={locate}
            onStopsLoaded={setNearbyStops}
          />
        )}

        {view === "search" && <SearchPanel userPosition={position} onSearch={search} onRequestPosition={locate} onBack={backToHome} />}

        {view === "results" && (
          <ResultsPanel
            originLabel={planner.origin?.label ?? ""}
            destinationLabel={planner.destination?.label ?? ""}
            routes={planner.routes}
            selectedIndex={planner.selectedIndex}
            loading={planner.loading}
            failed={planner.failed}
            notice={planner.notice}
            onSelect={selectRoute}
            onOpenDetail={() => goTo("detail")}
            onBack={() => goTo("search")}
          />
        )}

        {view === "detail" && selectedRoute && (
          <DetailPanel
            route={selectedRoute}
            destinationLabel={planner.destination?.label ?? "Arrivée"}
            onBack={() => goTo("results")}
            onStart={() => {
              mapRef.current?.startFollow();
              goTo("navigation");
            }}
          />
        )}

        {view === "navigation" && selectedRoute && (
          <NavigationPanel
            route={selectedRoute}
            position={position}
            onExit={backToHome}
            onArrived={() => {
              planner.recordTrip();
              goTo("arrival");
            }}
          />
        )}

        {view === "arrival" && selectedRoute && (
          <ArrivalPanel route={selectedRoute} destinationLabel={planner.destination?.label ?? "destination"} onDone={backToHome} />
        )}
      </BottomSheet>

      <GeolocationConsentDialog
        open={location.state === "asking"}
        onOpenChange={(open) => {
          if (!open) dismissAsking();
        }}
        onAccept={acceptConsent}
        onRefuse={refuseConsent}
      />

      <GeolocationErrorDialog
        open={failure !== null}
        onOpenChange={(open) => {
          if (!open) dismissFailure();
        }}
        variant={failure ?? "unavailable"}
      />
    </div>
  );
}
