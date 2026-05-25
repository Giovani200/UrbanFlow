"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Check } from "lucide-react";
import { Logo } from "@/app/components/ui/Logo";
import { usersService } from "@/app/services/users.service";

function PasswordStrength({ password }: { password: string }) {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  const labels = ["", "Faible", "Moyen", "Bon", "Fort"];
  const colors = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-green-500"];
  const textColors = ["", "text-red-500", "text-amber-500", "text-blue-500", "text-green-500"];
  if (!password) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex-1 h-1 rounded-full ${i <= score ? colors[score] : "bg-uf-border"}`} />
      ))}
      <span className={`text-xs ml-1 ${textColors[score]}`}>{labels[score]}</span>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [rgpd, setRgpd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rgpd) {
      setError("Vous devez accepter la politique de confidentialité");
      return;
    }
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const result = await usersService.register({
      email: form.get("email") as string,
      name: form.get("name") as string,
      password: form.get("password") as string,
    });

    setLoading(false);
    if (!result.isOk) {
      setError(result.error);
      return;
    }
    router.push("/auth/login");
  }

  return (
    <div className="min-h-screen bg-uf-white flex flex-col px-6 pb-8 max-w-sm mx-auto">
      <div className="pt-8 pb-6">
        <Logo size="md" />
      </div>

      <div className="flex flex-col gap-5 flex-1">
        <div>
          <h1 className="text-2xl font-bold text-uf-text tracking-tight mb-1">Créer un compte</h1>
          <p className="text-sm text-uf-text-secondary">Rejoignez la communauté UrbanFlow</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-uf-text">Prénom et nom</label>
            <input id="name" name="name" type="text" placeholder="Thomas Dupont" required
              className="w-full border border-uf-border rounded-lg px-3.5 py-3 text-sm text-uf-text outline-none focus:border-uf-red transition-colors" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-uf-text">Adresse e-mail</label>
            <input id="email" name="email" type="email" placeholder="vous@exemple.fr" required
              className="w-full border border-uf-border rounded-lg px-3.5 py-3 text-sm text-uf-text outline-none focus:border-uf-red transition-colors" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-uf-text">Mot de passe</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? "text" : "password"}
                placeholder="8 caractères minimum" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-uf-border rounded-lg px-3.5 py-3 pr-10 text-sm text-uf-text outline-none focus:border-uf-red transition-colors" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-uf-text-secondary">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-uf-bg rounded-xl border border-uf-border">
            <button type="button" onClick={() => setRgpd(!rgpd)}
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors ${rgpd ? "bg-uf-red border-uf-red" : "bg-white border-uf-border"}`}>
              {rgpd && <Check size={11} color="white" strokeWidth={3} />}
            </button>
            <p className="text-sm text-uf-text-secondary leading-relaxed">
              J&apos;accepte la{" "}
              <span className="text-uf-red font-medium cursor-pointer">politique de confidentialité</span>{" "}
              et le traitement de mes données personnelles conformément au RGPD.
            </p>
          </div>

          {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-uf-red text-white rounded-lg py-3.5 font-semibold text-sm tracking-tight disabled:opacity-60 transition-opacity">
            {loading ? "Inscription…" : "S'inscrire"}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-uf-border" />
          <span className="text-xs text-uf-text-secondary font-medium">ou</span>
          <div className="flex-1 h-px bg-uf-border" />
        </div>

        <p className="text-center text-sm text-uf-text-secondary">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-uf-red font-semibold">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
