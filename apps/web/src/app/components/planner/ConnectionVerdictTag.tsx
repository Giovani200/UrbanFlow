import type { ConnectionVerdict } from "@urbanflow/app-front-back-lib";
import { verdictLabel } from "@/app/lib/routine";

const BASE = "inline-flex min-h-[30px] items-center self-start rounded-[15px] px-3 [font:var(--uf-note)] font-bold";

const QUIET = "border border-uf-ink/20 bg-uf-inset";

const SURFACES: Record<ConnectionVerdict["kind"], string> = {
  holds: QUIET,
  frequent: QUIET,
  tight: "border-[1.5px] border-uf-ink bg-uf-inset",
  missed: "bg-uf-ink text-uf-on-ink",
  unknown: "border-[1.5px] border-dashed border-uf-ink-2 text-uf-ink-2",
};

/** L'état d'une correspondance, lu par la forme et par un mot, jamais par la couleur seule. Il ne s'anime pas. */
export function ConnectionVerdictTag({ verdict }: { verdict: ConnectionVerdict }) {
  return <span className={`${BASE} ${SURFACES[verdict.kind]}`}>{verdictLabel(verdict)}</span>;
}
