"use client";

import {useState} from "react";
import {signIn} from "next-auth/react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Eye, EyeOff, Shield} from "lucide-react";
import {Logo} from "@/app/components/ui/Logo";

export default function LoginPage() {
    const router = useRouter();
    const [showPassword, setShowPassword] =
        useState(false);
    const [error, setError] = useState<string |
        null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const form = new FormData(e.currentTarget);
        const result = await signIn("credentials", {
            email: form.get("email"),
            password: form.get("password"),
            redirect: false,
        });

        setLoading(false);
        if (result?.error) {
            setError("Email ou mot de passe incorrect");
            return;
        }
        router.push("/");
    }

    return (
        <div className="min-h-screen bg-uf-white flex flex-col px-6 pb-8 max-w-sm mx-auto">
            <div className="pt-8 pb-6">
                <Logo size="md"/>
            </div>

            <div className="flex flex-col gap-5 flex-1">
                <div>
                    <h1 className="text-2xl font-bold text-uf-text tracking-tight mb-1">
                        Bon retour 👋
                    </h1>
                    <p className="text-sm text-uf-text-secondary">
                        Connectez-vous à votre espace
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="email" className="text-sm font-medium text-uf-text">
                            Adresse e-mail
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="vous@exemple.fr"
                            required
                            className="w-full border border-uf-border rounded-lg px-3.5 py-3 text-sm text-uf-text outline-none focus:border-uf-red transition-colors"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center">
                            <label htmlFor="password"
                                   className="text-sm font-medium text-uf-text">
                                Mot de passe
                            </label>
                            <span className="text-sm text-uf-red font-medium cursor-pointer">
                  Mot de passe oublié ?
                </span>
                        </div>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                required
                                className="w-full border border-uf-border rounded-lg px-3.5 py-3 pr-10 text-sm text-uf-text outline-none focus:border-uf-red transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-uf-text-secondary">
                                {showPassword ? <EyeOff size={16}/> :
                                    <Eye size={16}/>}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 font-medium">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-uf-red text-white rounded-lg py-3.5 font-semibold text-sm tracking-tight disabled:opacity-60 transition-opacity"
                    >
                        {loading ? "Connexion…" : "Se connecter"}
                    </button>
                </form>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-uf-border"/>
                    <span className="text-xs text-uf-text-secondary font-medium">ou</span>
                    <div className="flex-1 h-px bg-uf-border"/>
                </div>

                <p className="text-center text-sm text-uf-text-secondary">
                    Pas encore de compte ?{" "}
                    <Link href="/auth/register" className="text-uf-red font-semibold">
                        S&apos; inscrire
                    </Link>
                </p>

                <div className="flex items-center justify-center gap-2 mt-auto">
                    <Shield size={13}
                            className="text-uf-text-secondary"/>
                    <span className="text-xs text-uf-text-secondary">
                        Connexion sécurisée — chiffrement TLS 1.3
                    </span>
                </div>
            </div>
        </div>
    );
}