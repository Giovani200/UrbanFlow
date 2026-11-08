"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ROUTINE_RULES, type RoutineFields } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { RoutineForm } from "@/app/components/routines/RoutineForm";
import { RoutineList } from "@/app/components/routines/RoutineList";
import { Button } from "@/app/components/ui/Button";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { PageShell } from "@/app/components/ui/PageShell";
import { routinesService, type RoutineDtoOut } from "@/app/services/routines.service";

type Editing = { mode: "closed" } | { mode: "new" } | { mode: "edit"; routine: RoutineDtoOut };

export default function RoutinesPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [routines, setRoutines] = useState<RoutineDtoOut[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "failed">("loading");
  const [editing, setEditing] = useState<Editing>({ mode: "closed" });
  const [deleteFailed, setDeleteFailed] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void routinesService.list().then((result) => {
      if (!result.isOk) {
        setLoadState("failed");
        return;
      }
      setRoutines(result.data.routines);
      setLoadState("loaded");
    });
  }, [status]);

  async function saveRoutine(fields: RoutineFields): Promise<boolean> {
    if (editing.mode === "edit") {
      const result = await routinesService.update(editing.routine.id, fields);
      if (!result.isOk) return false;
      setRoutines((current) => current.map((routine) => (routine.id === result.data.id ? result.data : routine)));
    } else {
      const result = await routinesService.create(fields);
      if (!result.isOk) return false;
      setRoutines((current) => [...current, result.data]);
    }
    setEditing({ mode: "closed" });
    return true;
  }

  async function deleteRoutine(routine: RoutineDtoOut) {
    setDeleteFailed(false);
    const result = await routinesService.remove(routine.id);
    if (!result.isOk) {
      setDeleteFailed(true);
      return;
    }
    setRoutines((current) => current.filter((candidate) => candidate.id !== routine.id));
  }

  if (status !== "authenticated" || loadState === "loading") {
    return (
      <PageShell title="Mes routines">
        <p role="status" className="px-1 [font:var(--uf-body)] font-medium text-uf-ink-2">
          Chargement…
        </p>
      </PageShell>
    );
  }

  if (loadState === "failed") {
    return (
      <PageShell title="Mes routines">
        <p role="alert" className="px-1 [font:var(--uf-body)] font-medium">
          Impossible de charger tes routines. Réessaie dans un instant.
        </p>
      </PageShell>
    );
  }

  if (editing.mode !== "closed") {
    return (
      <PageShell title="Mes routines">
        <RoutineForm
          key={editing.mode === "edit" ? editing.routine.id : "new"}
          routine={editing.mode === "edit" ? editing.routine : null}
          onSave={saveRoutine}
          onCancel={() => setEditing({ mode: "closed" })}
        />
      </PageShell>
    );
  }

  const isFull = routines.length >= ROUTINE_RULES.maxPerAccount;

  return (
    <PageShell title="Mes routines">
      <GlassPanel as="section" aria-label="Liste des routines" className="flex flex-col gap-3 p-5">
        {routines.length === 0 ? (
          <p className="[font:var(--uf-body)]">
            Une routine, c&apos;est un trajet que tu fais souvent : l&apos;app te dit quand partir et si ta correspondance tient, sans que tu cherches.
          </p>
        ) : (
          <RoutineList
            routines={routines}
            onEdit={(routine) => setEditing({ mode: "edit", routine })}
            onDelete={(routine) => void deleteRoutine(routine)}
          />
        )}

        {deleteFailed && (
          <p role="alert" className="[font:var(--uf-body)] font-bold">La suppression a échoué. Réessaie dans un instant.</p>
        )}

        {isFull ? (
          <p className="[font:var(--uf-note)] text-uf-ink-2">
            {ROUTINE_RULES.maxPerAccount} routines au maximum. Supprimes-en une pour en créer une autre.
          </p>
        ) : (
          <Button variant="primary" onClick={() => setEditing({ mode: "new" })}>
            <Plus size={18} aria-hidden="true" />
            Nouvelle routine
          </Button>
        )}
      </GlassPanel>
    </PageShell>
  );
}
