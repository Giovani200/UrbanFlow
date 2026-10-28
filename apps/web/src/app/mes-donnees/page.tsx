"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { Button } from "@/app/components/ui/Button";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { PageShell } from "@/app/components/ui/PageShell";
import { usersService } from "@/app/services/users.service";

export default function MesDonneesPage() {
  const router = useRouter();
  const { status, logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login");
  }, [status, router]);

  async function handleExport() {
    setExportError(false);
    setExporting(true);
    const result = await usersService.exportData();
    setExporting(false);
    if (!result.isOk) {
      setExportError(true);
      return;
    }
    const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "urbanflow-mes-donnees.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await usersService.deleteAccount();
    setDeleting(false);
    if (result.isOk) {
      await logout();
      router.replace("/");
    }
  }

  if (status !== "authenticated") {
    return (
      <PageShell title="Mes données">
        <p role="status" className="px-1 [font:var(--uf-body)] font-medium text-uf-ink-2">
          Chargement…
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Mes données">
      <p className="px-1 [font:var(--uf-body)] font-medium text-uf-ink-2">
        Exporte l&apos;ensemble de tes données ou supprime définitivement ton compte. Ces actions relèvent de tes droits d&apos;accès, de
        portabilité et d&apos;effacement.
      </p>

      <GlassPanel as="section" aria-labelledby="telecharger" className="flex flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Download size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h2 id="telecharger" className="[font:var(--uf-time)]">Télécharger mes données</h2>
            <p className="[font:var(--uf-note)] text-uf-ink-2">Compte, préférences, adresses, trajets et empreinte, au format JSON.</p>
          </div>
        </div>
        {exportError && (
          <p role="alert" className="[font:var(--uf-note)]">
            Échec de l&apos;export. Réessaie.
          </p>
        )}
        <Button variant="primary" onClick={handleExport} disabled={exporting}>
          {exporting ? "Préparation…" : "Télécharger (JSON)"}
        </Button>
      </GlassPanel>

      <GlassPanel as="section" aria-labelledby="supprimer" className="flex flex-col gap-3 p-5">
        <div className="flex items-start gap-3">
          <Trash2 size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <h2 id="supprimer" className="[font:var(--uf-time)]">Supprimer mon compte</h2>
            <p className="[font:var(--uf-note)] text-uf-ink-2">Efface définitivement ton compte et toutes tes données.</p>
          </div>
        </div>
        {confirmingDelete ? (
          <div className="flex flex-col gap-3">
            <p className="[font:var(--uf-body)]">Action définitive : préférences, adresses favorites et historique carbone seront supprimés.</p>
            <div className="flex gap-2">
              <Button variant="inset" onClick={() => setConfirmingDelete(false)} className="flex-1">
                Annuler
              </Button>
              <Button variant="primary" onClick={handleDelete} disabled={deleting} className="h-11 flex-1">
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="inset" onClick={() => setConfirmingDelete(true)}>
            Supprimer mon compte
          </Button>
        )}
      </GlassPanel>
    </PageShell>
  );
}
