import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "glass" | "inset" | "text";

const BASE = "inline-flex items-center justify-center gap-2 rounded-full font-uf-text text-[15px] font-bold cursor-pointer transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "h-[52px] px-[22px] bg-uf-ink text-uf-on-ink",
    glass: "uf-glass h-[52px] px-[22px] text-uf-ink",
    inset: "uf-inset h-11 px-[18px] text-uf-ink",
    text: "min-h-11 px-3 bg-transparent text-uf-ink underline underline-offset-4",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

/** Classes d'un bouton, pour donner son apparence à un lien (`Link`) sans dupliquer le style. */
export function buttonClassName(variant: ButtonVariant = "inset", className = ""): string {
    return `${BASE} ${VARIANTS[variant]} ${className}`;
}

/** Une seule action principale par écran (`primary`). `glass` hors panneau, `inset` dans un panneau, `text` pour le reste. */
export function Button({ variant = "inset", type = "button", className = "", ...rest }: ButtonProps) {
    return <button type={type} className={buttonClassName(variant, className)} {...rest} />;
}
