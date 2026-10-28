import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface PageShellProps {
  title: string;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Gabarit des pages hors carte : fond d'ambiance, retour, titre, contenu défilant.
 * Le contenu pose ses propres `GlassPanel` : 4 au plus à l'écran, les sous-blocs en encart.
 */
export function PageShell({ title, backHref = "/", actions, children }: PageShellProps) {
  return (
    <div className="flex h-dvh flex-col text-uf-ink">
      <header className="flex shrink-0 items-center gap-3 px-5 pt-12 pb-2">
        <Link href={backHref} aria-label="Retour" className="uf-glass flex size-11 items-center justify-center rounded-full">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <div className="flex-1" />
        {actions}
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-10">
        <h1 className="px-1 pb-1 [font:var(--uf-title)] tracking-(--uf-title-tracking)">{title}</h1>
        {children}
      </div>
    </div>
  );
}
