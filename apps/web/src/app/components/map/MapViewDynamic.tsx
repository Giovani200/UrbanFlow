import dynamic from "next/dynamic";

export const MapViewDynamic = dynamic(
  () => import("./MapView"),
  { ssr: false, loading: () => <div className="h-full w-full" /> }
);
