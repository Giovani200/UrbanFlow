import { Bike, Bus, Car, Footprints, TrainFront, TrainFrontTunnel, TramFront } from "lucide-react";
import type { ElementType } from "react";

/** Icône, libellé et couleur de repli par mode. Une ligne affiche toujours sa couleur officielle, quand elle existe. */
export const MODE_META: Record<string, { color: string; icon: ElementType; label: string }> = {
  walk: { color: "#5A6470", icon: Footprints, label: "Marche" },
  bike: { color: "#11805A", icon: Bike, label: "Vélo" },
  tram: { color: "#2F62E6", icon: TramFront, label: "Tram" },
  bus: { color: "#B45309", icon: Bus, label: "Bus" },
  metro: { color: "#3D4FB8", icon: TrainFrontTunnel, label: "Métro" },
  rer: { color: "#8A3FA0", icon: TrainFront, label: "RER" },
  train: { color: "#B0458A", icon: TrainFront, label: "Transilien" },
  ter: { color: "#6B5A2E", icon: TrainFront, label: "TER" },
  carpool: { color: "#9A1B2F", icon: Car, label: "Covoiturage" },
  car: { color: "#9A1B2F", icon: Car, label: "Voiture" },
};

export const MODE_FALLBACK = MODE_META.walk;
