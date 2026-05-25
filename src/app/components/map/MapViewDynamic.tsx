import dynamic from "next/dynamic";

export const MapViewDynamic = dynamic(
  () => import("./MapView"),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-100" /> }
);
