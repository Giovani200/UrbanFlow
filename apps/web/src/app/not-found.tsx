import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { buttonClassName } from "@/app/components/ui/Button";
import { GlassPanel } from "@/app/components/ui/GlassPanel";

export default function NotFound() {
  return (
    <div className="flex h-dvh items-center justify-center px-6">
      <GlassPanel className="flex max-w-sm flex-col items-center gap-3 p-6 text-center">
        <MapPinOff size={28} aria-hidden="true" />
        <p className="[font:var(--uf-note)] text-uf-ink-2">Erreur 404</p>
        <h1 className="[font:var(--uf-time)]">Page introuvable</h1>
        <p className="[font:var(--uf-body)] font-medium text-uf-ink-2">Cette page n&apos;existe pas ou a été déplacée.</p>
        <Link href="/" className={buttonClassName("primary", "mt-2")}>
          Retour à l&apos;accueil
        </Link>
      </GlassPanel>
    </div>
  );
}
