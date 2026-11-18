import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "glass" | "inset" | "text";
export type ButtonSize = "regular" | "compact";

const BASE = "inline-flex items-center justify-center gap-2 rounded-full font-uf-text text-[15px] font-bold cursor-pointer transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
    primary: "bg-uf-ink text-uf-on-ink",
    glass: "uf-glass text-uf-ink",
    inset: "uf-inset text-uf-ink",
    text: "min-h-11 px-3 bg-transparent text-uf-ink underline underline-offset-4",
};

const SIZES: Record<ButtonSize, string> = {
    regular: "h-[52px] px-[22px]",
    compact: "h-11 px-[18px]",
};

/**
 * La hauteur passe par `size`, jamais par `className` : deux classes de hauteur se départagent par leur ordre dans la
 * feuille de style générée, pas par leur ordre dans l'attribut.
 */
const DEFAULT_SIZES: Record<ButtonVariant, ButtonSize | null> = {
    primary: "regular",
    glass: "regular",
    inset: "compact",
    text: null,
};

/** Classes d'un bouton, pour donner son apparence à un lien (`Link`) sans dupliquer le style. */
export function buttonClassName(variant: ButtonVariant = "inset", className = "", size = DEFAULT_SIZES[variant]): string {
    return `${BASE} ${VARIANTS[variant]} ${size ? SIZES[size] : ""} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

/** Une seule action principale par écran (`primary`). `glass` hors panneau, `inset` dans un panneau, `text` pour le reste. */
export function Button({ variant = "inset", size, type = "button", className = "", ...rest }: ButtonProps) {
    return <button type={type} className={buttonClassName(variant, className, size ?? DEFAULT_SIZES[variant])} {...rest} />;
}
