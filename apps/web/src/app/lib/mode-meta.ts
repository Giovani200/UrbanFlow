import { Bike, Bus, Car, Footprints, TrainFront, Zap } from "lucide-react";
import type { ElementType } from "react";

// Couleur + icône + libellé par mode, alignés sur la DA (design/DA.md).
export const MODE_META: Record<string, { color: string; icon: ElementType; label: string }> = {
  walk: { color: "#5A6470", icon: Footprints, label: "Marche" },
  bike: { color: "#138A5E", icon: Bike, label: "Vélo" },
  scooter: { color: "#5A6470", icon: Zap, label: "Trottinette" },
  tram: { color: "#2F62E6", icon: TrainFront, label: "Tram" },
  bus: { color: "#E07A1F", icon: Bus, label: "Bus" },
  carpool: { color: "#9A1B2F", icon: Car, label: "Covoiturage" },
  car: { color: "#9A1B2F", icon: Car, label: "Voiture" },
};

export const MODE_FALLBACK = MODE_META.walk;
