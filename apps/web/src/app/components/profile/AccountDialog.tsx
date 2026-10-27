"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { Modal } from "@/app/components/ui/Modal";
import { usersService } from "@/app/services/users.service";

const MINIMUM_NAME_LENGTH = 2;
const MINIMUM_PASSWORD_LENGTH = 8;

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  name: string | null;
  hasPassword: boolean;
  onNameChanged: (name: string | null) => void;
}

/** Compte : changer de nom et, pour un compte à mot de passe, changer de mot de passe. */
export function AccountDialog({ open, onOpenChange, email, name, hasPassword, onNameChanged }: AccountDialogProps) {
  const [nameDraft, setNameDraft] = useState(name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  function resetPasswordForm() {
    setChangingPassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setPasswordError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetPasswordForm();
      setNameDraft(name ?? "");
    }
    onOpenChange(nextOpen);
  }

  async function handleSaveName() {
    if (nameDraft.trim().length < MINIMUM_NAME_LENGTH) return;
    setSavingName(true);
    const result = await usersService.updateAccount({ name: nameDraft.trim() });
    setSavingName(false);
    if (result.isOk) onNameChanged(result.data.name);
  }

  async function handleChangePassword() {
    setPasswordError(null);
    if (newPassword.length < MINIMUM_PASSWORD_LENGTH) {
      setPasswordError(`${MINIMUM_PASSWORD_LENGTH} caractères minimum`);
      return;
    }
    setSavingPassword(true);
    const result = await usersService.changePassword({ currentPassword, newPassword });
    setSavingPassword(false);
    if (result.isOk) {
      resetPasswordForm();
    } else {
      setPasswordError("Mot de passe actuel incorrect");
    }
  }

  const nameUnchanged = nameDraft.trim() === (name ?? "");

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Ton compte" description={email}>
      <div className="flex flex-col gap-5">
        <div className="flex items-end gap-2">
          <FormField label="Nom" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="flex-1" />
          <Button
            variant="inset"
            onClick={handleSaveName}
            disabled={savingName || nameDraft.trim().length < MINIMUM_NAME_LENGTH || nameUnchanged}
          >
            {savingName ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>

        {hasPassword && !changingPassword && (
          <Button variant="inset" onClick={() => setChangingPassword(true)} className="self-start">
            Changer de mot de passe
          </Button>
        )}

        {hasPassword && changingPassword && (
          <div className="flex flex-col gap-3">
            <FormField
              label="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
            <FormField
              label={`Nouveau mot de passe, ${MINIMUM_PASSWORD_LENGTH} caractères minimum`}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            {passwordError && (
              <p role="alert" className="[font:var(--uf-note)]">
                {passwordError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={handleChangePassword}
                disabled={savingPassword || !currentPassword || !newPassword}
                className="flex-1"
              >
                {savingPassword ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button variant="text" onClick={resetPasswordForm}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
