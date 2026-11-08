import { Pencil, Trash2 } from "lucide-react";
import { ROUTINE_WEEKDAYS } from "@/app/lib/routine-form";
import type { RoutineDtoOut } from "@/app/services/routines.service";

const ICON_BUTTON = "flex size-11 shrink-0 items-center justify-center rounded-full";

function formatWeekdays(weekdays: number[]): string {
  return ROUTINE_WEEKDAYS.filter((day) => weekdays.includes(day.id))
    .map((day) => day.short)
    .join(" ");
}

interface RoutineListProps {
  routines: RoutineDtoOut[];
  onEdit: (routine: RoutineDtoOut) => void;
  onDelete: (routine: RoutineDtoOut) => void;
}

/** Les routines du compte : lieux, heure d'arrivée et jours, avec de quoi les modifier ou les supprimer. */
export function RoutineList({ routines, onEdit, onDelete }: RoutineListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {routines.map((routine) => (
        <li key={routine.id} className="uf-inset flex items-center gap-2 rounded-uf-inset py-2 pr-1 pl-4">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate [font:var(--uf-body)] font-bold">{routine.name}</span>
            <span className="truncate [font:var(--uf-note)]">
              {routine.origin.label} <span className="sr-only">vers</span>
              <span aria-hidden="true"> › </span>
              {routine.destination.label}
            </span>
            <span className="[font:var(--uf-note)] tabular-nums text-uf-ink-2">
              Arriver avant {routine.arrivalTime} · {formatWeekdays(routine.weekdays)}
            </span>
          </span>
          <button type="button" onClick={() => onEdit(routine)} aria-label={`Modifier ${routine.name}`} className={ICON_BUTTON}>
            <Pencil size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onDelete(routine)} aria-label={`Supprimer ${routine.name}`} className={ICON_BUTTON}>
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
