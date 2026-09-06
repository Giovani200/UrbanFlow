"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
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
    const res = await usersService.exportData();
    setExporting(false);
    if (!res.isOk) {
      setExportError(true);
      return;
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "urbanflow-mes-donnees.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await usersService.deleteAccount();
    setDeleting(false);
    if (res.isOk) {
      await logout();
      router.replace("/");
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-bg font-sans">
      <div className="bg-white border-b border-border px-5 pt-12 pb-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push("/")}
          aria-label="Retour"
          className="w-9 h-9 rounded-lg border border-border flex items-center justify-center"
        >
          <ArrowLeft size={16} className="text-ink" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold text-ink">Mes données</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-3">
        <div className="bg-white rounded-xl p-4">
          <p className="text-[13px] text-text-2 leading-relaxed">
            Exportez l&apos;ensemble de vos données ou supprimez définitivement votre compte. Ces actions relèvent de vos droits d&apos;accès, de portabilité et d&apos;effacement.
          </p>
        </div>

        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-tint flex items-center justify-center shrink-0">
              <Download size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-semibold text-ink">Télécharger mes données</h2>
              <p className="text-[12px] text-text-2 mt-0.5">
                Compte, préférences, adresses, trajets et empreinte, au format JSON.
              </p>
            </div>
          </div>
          {exportError && (
            <p role="alert" className="text-[11px] text-red-600 mt-2">Échec de l&apos;export. Réessaie.</p>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="mt-3 w-full bg-primary text-white rounded-lg py-2.5 text-[13px] font-semibold disabled:opacity-50"
          >
            {exporting ? "Préparation…" : "Télécharger (JSON)"}
          </button>
        </div>

        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-semibold text-ink">Supprimer mon compte</h2>
              <p className="text-[12px] text-text-2 mt-0.5">
                Efface définitivement votre compte et toutes vos données.
              </p>
            </div>
          </div>
          {!confirmingDelete ? (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="mt-3 w-full rounded-lg border border-red-200 text-red-600 py-2.5 text-[13px] font-semibold"
            >
              Supprimer mon compte
            </button>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-[12px] text-text-2">
                Action définitive : préférences, adresses favorites et historique carbone seront supprimés.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-[13px] text-text-2"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-[13px] font-semibold disabled:opacity-50"
                >
                  {deleting ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}