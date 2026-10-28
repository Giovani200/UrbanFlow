import type { TransitLine, TransitStopMode } from "@urbanflow/app-front-back-lib";

/** Du plus structurant au moins structurant : c'est le mode qui représente l'arrêt sur la carte. */
const MODE_PRIORITY: TransitStopMode[] = ["metro", "rer", "train", "ter", "tram", "bus"];

/** Mode affiché pour un arrêt : celui de sa ligne la plus structurante (un arrêt du métro 11 et de bus est un arrêt de métro). */
export function primaryStopMode(lines: TransitLine[]): TransitStopMode {
  const modes = new Set(lines.map((line) => line.mode));
  return MODE_PRIORITY.find((mode) => modes.has(mode)) ?? "bus";
}
