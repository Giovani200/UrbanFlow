import dynamic from "next/dynamic";
import type { MapViewHandle } from "./MapView";

export type { MapViewHandle };

export const MapViewDynamic = dynamic(
  () => import("./MapView"),
  { ssr: false, loading: () => <div className="w-full h-full bg-bg" /> }
);
