"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Clock, Database, Download, HelpCircle, Leaf, Lock, LogIn, LogOut, User, X } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { PwaInstallInstructions } from "@/app/components/pwa/PwaInstallInstructions";
import { useEscapeKey } from "@/app/hooks/useEscapeKey";
import { usePwaInstall } from "@/app/hooks/usePwaInstall";

const SIGNED_IN_ITEMS = [
  { icon: User, label: "Compte", href: "/profile" },
  { icon: Leaf, label: "Mon empreinte", href: "/carbon" },
  { icon: Clock, label: "Mes trajets", href: "/trips" },
  { icon: Database, label: "Mes données", href: "/mes-donnees" },
  { icon: Lock, label: "Confidentialité", href: "/confidentialite" },
  { icon: HelpCircle, label: "Aide", href: "/aide" },
];

const GUEST_ITEMS = [
  { icon: HelpCircle, label: "Aide", href: "/aide" },
  { icon: Lock, label: "Confidentialité", href: "/confidentialite" },
];

const ROW = "flex min-h-11 w-full items-center gap-3 rounded-uf-inset px-4 py-2.5 text-left [font:var(--uf-body)]";

/** Paramètres, affichés dans le panneau principal à la place de l'accueil. */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { canInstall, isIOS, promptInstall } = usePwaInstall();
  const [showInstallSteps, setShowInstallSteps] = useState(false);
  const signedIn = user !== null;
  const items = signedIn ? SIGNED_IN_ITEMS : GUEST_ITEMS;

  useEscapeKey(() => {
    if (!showInstallSteps) onClose();
  });

  async function handleInstall() {
    if (isIOS) {
      setShowInstallSteps(true);
      return;
    }
    await promptInstall();
  }

  async function handleSignOut() {
    await logout();
    onClose();
    router.push("/");
  }

  return (
    <section aria-labelledby="titre-parametres" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="titre-parametres" className="[font:var(--uf-time)]">
            Paramètres
          </h2>
          <p className="[font:var(--uf-note)] text-uf-ink-2">{signedIn ? user.email : "Sans compte"}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer les paramètres" className="uf-inset flex size-11 items-center justify-center rounded-full">
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <nav aria-label="Pages de l'application">
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={`uf-inset ${ROW}`}>
                <item.icon size={20} aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {canInstall && (
        <button type="button" onClick={handleInstall} className={`uf-inset ${ROW}`}>
          <Download size={20} aria-hidden="true" />
          Installer l&apos;application
        </button>
      )}

      {signedIn ? (
        <button type="button" onClick={handleSignOut} className={`uf-inset ${ROW}`}>
          <LogOut size={20} aria-hidden="true" />
          Se déconnecter
        </button>
      ) : (
        <Link href="/auth/login" className={`bg-uf-ink text-uf-on-ink ${ROW}`}>
          <LogIn size={20} aria-hidden="true" />
          Se connecter
        </Link>
      )}

      <PwaInstallInstructions open={showInstallSteps} onOpenChange={setShowInstallSteps} />
    </section>
  );
}
