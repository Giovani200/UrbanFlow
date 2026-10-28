import { Logo } from "@/app/components/ui/Logo";

/** Connexion et inscription : fond d'ambiance, logo, puis le formulaire en verre. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-dvh text-uf-ink">
            <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 pt-10 pb-8">
                <Logo />
                {children}
            </div>
        </div>
    );
}
