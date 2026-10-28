import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui/Button";
import type { TripRoute } from "@/app/services/trips.service";
import { RouteCard } from "./RouteCard";

interface ResultsPanelProps {
  originLabel: string;
  destinationLabel: string;
  routes: TripRoute[];
  selectedIndex: number;
  loading: boolean;
  failed: boolean;
  notice: string | null;
  onSelect: (index: number) => void;
  onOpenDetail: () => void;
  onBack: () => void;
}

/** Les itinéraires proposés. Le transport en commun d'abord ; une panne de la source est dite, jamais cachée. */
export function ResultsPanel({
  originLabel,
  destinationLabel,
  routes,
  selectedIndex,
  loading,
  failed,
  notice,
  onSelect,
  onOpenDetail,
  onBack,
}: ResultsPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="inset" onClick={onBack} aria-label="Modifier la recherche" className="w-11 shrink-0 px-0">
          <ArrowLeft size={18} aria-hidden="true" />
        </Button>
        <h2 className="min-w-0 [font:var(--uf-body)]">
          <span className="block truncate text-uf-ink-2">{originLabel}</span>
          <span className="block truncate font-bold">{destinationLabel}</span>
        </h2>
      </div>

      <div aria-live="polite" className="flex flex-col gap-2">
        {loading && <p className="[font:var(--uf-body)] text-uf-ink-2">Recherche des trajets…</p>}
        {failed && <p role="alert" className="[font:var(--uf-body)]">Le calcul des trajets a échoué. Réessaie dans un instant.</p>}
        {notice && <p className="uf-inset rounded-uf-inset px-4 py-3 [font:var(--uf-body)]">{notice}</p>}
      </div>

      {routes.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {routes.map((route, index) => (
              <li key={index}>
                <RouteCard route={route} selected={index === selectedIndex} onSelect={() => onSelect(index)} />
              </li>
            ))}
          </ul>
          <Button variant="primary" onClick={onOpenDetail}>
            Voir le trajet
          </Button>
        </>
      )}
    </div>
  );
}
