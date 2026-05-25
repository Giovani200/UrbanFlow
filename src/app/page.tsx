"use client";

import { useState } from "react";
import { Bike, ChevronRight, Navigation, MapPin, Settings, Home, Briefcase, Star, Layers } from "lucide-react";
import { MapViewDynamic } from "@/app/components/map/MapViewDynamic";

// Données mock — remplacées par l'API GBFS en F3
const stations = [
  { name: "Station Victor Hugo", dist: "180m", bikes: 7, docks: 3 },
  { name: "Station Berriat", dist: "340m", bikes: 2, docks: 8 },
  { name: "Station Europole", dist: "520m", bikes: 5, docks: 2 },
];

// Affiche la disponibilité des vélos avec code couleur
function BikeAvailability({ count }: { count: number }) {
  if (count > 3) return <span className="text-green-600 font-semibold">{count} vélos</span>;
  if (count > 0) return <span className="text-amber-600 font-semibold">{count} vélos</span>;
  return <span className="text-red-600 font-semibold">0 vélo</span>;
}

 // Ancienne version — raccourcis en chips horizontaux sous la barre de recherche
{[
  { icon: <Home size={15} />, label: "Maison" },
  { icon: <Briefcase size={15} />, label: "Boulot" },
  { icon: <Star size={15} />, label: "Favoris" },
].map((item) => (
  <button key={item.label} className="flex items-center gap-1.5 bg-white rounded-xl shadow-md px-3 py-2 text-xs font-medium text-uf-text">
    <span className="text-uf-red">{item.icon}</span>
    {item.label}
  </button>
))}


// Raccourcis latéraux : paramètres + destinations fréquentes
const sideActions = [
  { icon: <Settings size={18} />, label: "Paramètres" },
  { icon: <Home size={18} />, label: "Maison" },
  { icon: <Briefcase size={18} />, label: "Boulot" },
  { icon: <Star size={18} />, label: "Favoris" },
];

export default function PlannerPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans">

      {/* Carte plein écran — base de la vue */}
      <div className="absolute inset-0">
        <MapViewDynamic />
      </div>

      {/* Colonne supérieure droite : barre de recherche + actions latérales */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-12">
        <div className="flex items-start gap-2.5">

          {/* Colonne gauche : barre de recherche + chips en dessous */}
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

            {/* Chips sous la barre */}
            {/*<div className="flex gap-2">*/}
            {/*  {[*/}
            {/*    { icon: <Home size={15} />, label: "Maison" },*/}
            {/*    { icon: <Briefcase size={15} />, label: "Boulot" },*/}
            {/*    { icon: <Star size={15} />, label: "Favoris" },*/}
            {/*  ].map((item) => (*/}
            {/*    <button key={item.label} className="flex items-center gap-1.5 bg-white rounded-xl shadow-md px-3 py-2 text-xs font-medium text-uf-text">*/}
            {/*      <span className="text-uf-red">{item.icon}</span>*/}
            {/*      {item.label}*/}
            {/*    </button>*/}
            {/*  ))}*/}
            {/*</div>*/}
          </div>

          {/* Colonne d'icônes latérale : paramètres + raccourcis */}
          <div className="flex flex-col gap-2">
            {sideActions.map((action) => (
              <button
                key={action.label}
                title={action.label}
                className="w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center text-uf-text hover:text-uf-red transition-colors"
              >
                {action.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAB géolocalisation + couches — ancrés à droite au-dessus du drawer */}
      <button
        title="Ma position"
        className="absolute right-4 bottom-72 z-10 w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center"
      >
        <Navigation size={20} className="text-uf-text" />
      </button>
      <button
        title="Couches carte"
        className="absolute right-4 bottom-56 z-10 w-11 h-11 rounded-xl bg-white shadow-lg flex items-center justify-center"
      >
        <Layers size={20} className="text-uf-text" />
      </button>

      {/* Drawer bas — stations Métrovélo temps réel */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl pb-7">
        {/* Poignée visuelle */}
        <div className="w-9 h-1 rounded-full bg-uf-border mx-auto mt-3" />

        <div className="px-4 pt-3.5">
          {/* En-tête drawer */}
          <div className="flex justify-between items-center mb-3.5">
            <div>
              <p className="text-sm font-bold text-uf-text">Stations Métrovélo proches</p>
              <p className="text-xs text-uf-text-secondary mt-0.5">Mis à jour il y a 30s</p>
            </div>
            {/* Indicateur temps réel */}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-green-600 font-semibold">En direct</span>
            </div>
          </div>

          {/* Liste des stations */}
          <div className="flex flex-col gap-2 mb-3.5">
            {stations.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-uf-bg rounded-xl">
                {/* Icône vélo colorée selon disponibilité */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bikes > 0 ? "bg-uf-red-light" : "bg-gray-100"}`}>
                  <Bike size={18} className={s.bikes > 0 ? "text-uf-red" : "text-uf-text-secondary"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-uf-text truncate">{s.name}</p>
                  <p className="text-xs text-uf-text-secondary mt-0.5">
                    {s.dist} · <BikeAvailability count={s.bikes} /> · {s.docks} places
                  </p>
                </div>
                <ChevronRight size={14} className="text-uf-text-secondary shrink-0" />
              </div>
            ))}
          </div>

          {/* CTA principal — lance le planificateur */}
          <button className="w-full bg-uf-red text-white rounded-lg py-3.5 font-semibold text-sm flex items-center justify-center gap-2">
            <Navigation size={16} />
            Planifier un trajet
          </button>
        </div>
      </div>
    </div>
  );
}
