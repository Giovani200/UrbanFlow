"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { GoogleButton } from "@/app/components/auth/GoogleButton";
import { PasswordVisibilityToggle } from "@/app/components/auth/PasswordVisibilityToggle";
import { Button } from "@/app/components/ui/Button";
import { FormField } from "@/app/components/ui/FormField";
import { GlassPanel } from "@/app/components/ui/GlassPanel";

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setLoading(true);

        const form = new FormData(event.currentTarget);
        const result = await login({
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? ""),
        });

        setLoading(false);
        if (!result.isOk) {
            setError("Email ou mot de passe incorrect");
            return;
        }
        router.push("/");
    }

    return (
        <GlassPanel as="section" aria-labelledby="titre-connexion" className="flex flex-col gap-5 p-6">
            <div className="flex flex-col gap-1">
                <h1 id="titre-connexion" className="[font:var(--uf-title)] tracking-(--uf-title-tracking)">
                    Bon retour
                </h1>
                <p className="[font:var(--uf-body)] font-medium text-uf-ink-2">Connecte-toi à ton espace.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <FormField label="Adresse e-mail" name="email" type="email" autoComplete="email" placeholder="toi@exemple.fr" required />
                <FormField
                    label="Mot de passe"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    trailing={<PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />}
                />

                {error && (
                    <p role="alert" className="[font:var(--uf-body)]">
                        {error}
                    </p>
                )}

                <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? "Connexion…" : "Se connecter"}
                </Button>
            </form>

            <p className="text-center [font:var(--uf-note)] text-uf-ink-2">ou</p>

            <GoogleButton label="Continuer avec Google" />

            <p className="text-center [font:var(--uf-body)] font-medium">
                Pas encore de compte ?{" "}
                <Link href="/auth/register" className="underline underline-offset-4">
                    S&apos;inscrire
                </Link>
            </p>
        </GlassPanel>
    );
}
