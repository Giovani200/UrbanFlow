"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleButton } from "@/app/components/auth/GoogleButton";
import { PasswordVisibilityToggle } from "@/app/components/auth/PasswordVisibilityToggle";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { GlassPanel } from "@/app/components/ui/GlassPanel";
import { usersService } from "@/app/services/users.service";

const STRENGTH_RULES = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/];
const STRENGTH_LABELS = ["Faible", "Faible", "Moyen", "Bon", "Fort"];

/** Force du mot de passe : segments pleins et un mot, jamais la couleur seule. */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = STRENGTH_RULES.filter((rule) => rule.test(password)).length;
  return (
    <div className="flex items-center gap-1 px-1">
      {STRENGTH_RULES.map((_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`h-1.5 flex-1 rounded-full ${index < score ? "bg-uf-ink" : "uf-inset"}`}
        />
      ))}
      <span className="ml-1 [font:var(--uf-note)]">Sécurité : {STRENGTH_LABELS[score]}</span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acceptedTerms) {
      setError("Tu dois accepter la politique de confidentialité");
      return;
    }
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const result = await usersService.register({
      email: String(form.get("email") ?? ""),
      name: String(form.get("name") ?? ""),
      password: String(form.get("password") ?? ""),
      acceptedTerms: true,
    });

    setLoading(false);
    if (!result.isOk) {
      setError(result.error);
      return;
    }
    router.push("/auth/login");
  }

  return (
    <GlassPanel as="section" aria-labelledby="titre-inscription" className="flex flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h1 id="titre-inscription" className="[font:var(--uf-title)] tracking-(--uf-title-tracking)">
          Créer un compte
        </h1>
        <p className="[font:var(--uf-body)] font-medium text-uf-ink-2">Pour retrouver tes adresses, tes trajets et tes réglages.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Prénom et nom" name="name" type="text" autoComplete="name" placeholder="Thomas Dupont" required />
        <FormField label="Adresse e-mail" name="email" type="email" autoComplete="email" placeholder="toi@exemple.fr" required />
        <div className="flex flex-col gap-2">
          <FormField
            label="Mot de passe, 8 caractères minimum"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            trailing={<PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
          />
          <PasswordStrength password={password} />
        </div>

        <label className="uf-inset flex items-start gap-3 rounded-uf-inset p-4 [font:var(--uf-note)]">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-(--uf-ink)"
          />
          <span>
            J&apos;accepte la{" "}
            <Link href="/confidentialite" className="underline underline-offset-4">
              politique de confidentialité
            </Link>{" "}
            et le traitement de mes données personnelles conformément au RGPD.
          </span>
        </label>

        {error && (
          <p role="alert" className="[font:var(--uf-body)]">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? "Inscription…" : "S'inscrire"}
        </Button>
      </form>

      <p className="text-center [font:var(--uf-note)] text-uf-ink-2">ou</p>

      <GoogleButton label="S'inscrire avec Google" />

      <p className="text-center [font:var(--uf-body)] font-medium">
        Déjà un compte ?{" "}
        <Link href="/auth/login" className="underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </GlassPanel>
  );
}
