"use client";

import { useState, useRef } from "react";
import { Navigation, MapPin, Settings, Home, Briefcase, Star, Layers } from "lucide-react";
import { MapViewDynamic } from "@/app/components/map/MapViewDynamic";
import type { MapViewHandle } from "@/app/components/map/MapView";
import { SearchDrawer } from "@/app/components/planner/SearchDrawer";
import type { GeocodingResult } from "@/app/components/planner/SearchDrawer";
import { ResultsDrawer } from "@/app/components/planner/ResultsDrawer";
import { NavScreen } from "@/app/components/planner/NavScreen";
import { SettingsDrawer } from "@/app/components/settings/SettingsDrawer";
import { routingService } from "@/app/services/routing.service";
import type { Route } from "@/app/services/routing.service";

type View = "search" | "results" | "navigation";

const sideActions = [
  { icon: <Settings size={18} />, label: "Paramètres", action: "settings" as const },
  { icon: <Home size={18} />, label: "Maison", action: "home" as const },
  { icon: <Briefcase size={18} />, label: "Boulot", action: "work" as const },
  { icon: <Star size={18} />, label: "Favoris", action: "favorites" as const },
];

export default function PlannerPage() {
  const [view, setView] = useState<View>("search");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [originLabel, setOriginLabel] = useState("");
  const [destLabel, setDestLabel] = useState("");

  const mapRef = useRef<MapViewHandle>(null);

  async function handleSearch(origin: GeocodingResult, destination: GeocodingResult) {
    setOriginLabel(origin.label);
    setDestLabel(destination.label);
    setView("results");
    setLoading(true);
    setRoutes([]);
    setSelectedRoute(0);

    const result = await routingService.planRoute({
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: destination.lat,
      destLng: destination.lng,
    });

    setLoading(false);

    if (result.isOk && result.data.routes.length > 0) {
      setRoutes(result.data.routes);
      const first = result.data.routes[0];
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
    setView("search");
  }

  function handleLocateMe() {
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.showUserLocation(pos.coords.latitude, pos.coords.longitude),
      () => { /* geolocation denied */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">
      <div className="absolute inset-0">
        <MapViewDynamic ref={mapRef} />
      </div>

      {view === "search" && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12">
          <div className="flex items-start gap-2.5">
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="bg-white rounded-xl shadow-lg flex items-center gap-2.5 px-3.5 py-3">
                <MapPin size={16} className="text-uf-text-secondary shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Où voulez-vous aller ?"
                  className="flex-1 text-sm text-uf-text outline-none bg-transparent placeholder:text-uf-text-secondary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {sideActions.map((a) => (
                <button
                  key={a.label}
                  title={a.label}
                  onClick={() => {
                    if (a.action === "settings") setShowSettings(true);
                  }}
                  className="w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center text-uf-text hover:text-uf-red transition-colors"
                >
                  {a.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {view !== "navigation" && (
        <button
          title="Ma position"
          onClick={handleLocateMe}
          className="absolute right-4 bottom-72 z-10 w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center"
        >
          <Navigation size={20} className="text-uf-text" />
        </button>
      )}

      {/*{view !== "navigation" && (*/}
      {/*  <button*/}
      {/*    title="Couches carte"*/}
      {/*    className="absolute right-4 bottom-56 z-10 w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center"*/}
      {/*  >*/}
      {/*    <Layers size={20} className="text-uf-text" />*/}
      {/*  </button>*/}
      {/*)}*/}

      {view === "search" && (
        <SearchDrawer
          onSearch={handleSearch}
          onLocateMe={(position) => mapRef.current?.showUserLocation(position.lat, position.lng)}
        />
      )}

      {view === "results" && (
        <ResultsDrawer
          routes={routes}
          loading={loading}
          originLabel={originLabel}
          destLabel={destLabel}
          onBack={handleBack}
          onStart={() => setView("navigation")}
          onSelectRoute={handleSelectRoute}
          selectedIndex={selectedRoute}
        />
      )}

      {view === "navigation" && (
        <NavScreen onStop={() => { mapRef.current?.clearSegments(); setView("search"); }} />
      )}

      {showSettings && (
        <SettingsDrawer onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
