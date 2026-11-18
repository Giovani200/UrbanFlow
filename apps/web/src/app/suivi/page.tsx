import type { Metadata } from "next";
import { SharedTripView } from "@/app/components/sharing/SharedTripView";

export const metadata: Metadata = {
  title: "Trajet partagé",
  robots: { index: false, follow: false },
};

export default function SuiviPage() {
  return <SharedTripView />;
}
