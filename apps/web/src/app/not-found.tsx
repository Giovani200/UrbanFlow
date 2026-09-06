import Link from "next/link";
import { MapPinOff } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-bg text-center px-6 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center">
        <MapPinOff size={24} className="text-primary" />
      </div>
      <p className="text-xs font-semibold text-text-2">Erreur 404</p>
      <h1 className="text-[17px] font-semibold text-ink">Page introuvable</h1>
      <p className="text-[13px] text-text-2 max-w-[280px] leading-relaxed">
        Cette page n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
