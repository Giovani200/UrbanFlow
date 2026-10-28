import { ChevronRight } from "lucide-react";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { formatKilograms } from "@/app/lib/format";
import type { CarbonSummaryDtoOut } from "@urbanflow/app-front-back-lib";

interface ProfileHeaderProps {
  name: string | null;
  email: string;
  monthSummary: CarbonSummaryDtoOut | null;
  onOpenAccount: () => void;
}

function initialsOf(name: string | null, email: string): string {
  if (!name) return email[0].toUpperCase();
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Identité et bilan du mois ; toucher l'identité ouvre le compte. */
export function ProfileHeader({ name, email, monthSummary, onOpenAccount }: ProfileHeaderProps) {
  return (
    <GlassPanel as="section" aria-label="Toi" className="flex flex-col gap-4 p-5">
      <button type="button" onClick={onOpenAccount} className="flex min-h-11 w-full items-center gap-3.5 text-left">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-uf-ink [font:var(--uf-time)] text-uf-on-ink"
        >
          {initialsOf(name, email)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="[font:var(--uf-time)]">{name ?? "Ton compte"}</span>
          <span className="truncate [font:var(--uf-note)] text-uf-ink-2">{email}</span>
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>

      <dl className="grid grid-cols-2 gap-2.5">
        <div className="uf-inset flex flex-col gap-0.5 rounded-uf-inset p-3.5">
          <dt className="[font:var(--uf-note)] text-uf-ink-2">Trajets ce mois</dt>
          <dd className="[font:var(--uf-time)] tabular-nums">{monthSummary ? monthSummary.tripCount : "…"}</dd>
        </div>
        <div className="uf-inset flex flex-col gap-0.5 rounded-uf-inset p-3.5">
          <dt className="[font:var(--uf-note)] text-uf-ink-2">CO₂ économisé</dt>
          <dd className="[font:var(--uf-time)] tabular-nums">
            {monthSummary ? `${formatKilograms(monthSummary.totalSavedGrams)} kg` : "…"}
          </dd>
        </div>
      </dl>
    </GlassPanel>
  );
}
