import { WifiOff } from "lucide-react";
import { GlassPanel } from "@/app/components/ui/GlassPanel";

export default function OfflinePage() {
  return (
    <div className="flex h-dvh items-center justify-center px-6">
      <GlassPanel className="flex max-w-sm flex-col items-center gap-3 p-6 text-center">
        <WifiOff size={28} aria-hidden="true" />
        <h1 className="[font:var(--uf-time)]">Hors ligne</h1>
        <p className="[font:var(--uf-body)] font-medium text-uf-ink-2">
          Vérifie ta connexion. Les pages déjà consultées restent accessibles.
        </p>
      </GlassPanel>
    </div>
  );
}
