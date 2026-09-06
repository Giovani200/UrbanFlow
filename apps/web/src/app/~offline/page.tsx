import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-bg text-center px-6 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center">
        <WifiOff size={24} className="text-primary" />
      </div>
      <h1 className="text-[17px] font-semibold text-ink">Hors ligne</h1>
      <p className="text-[13px] text-text-2 max-w-[280px] leading-relaxed">
        Vérifie ta connexion. Les pages déjà consultées restent accessibles.
      </p>
    </div>
  );
}