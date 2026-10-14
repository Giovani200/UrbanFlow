import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
    label: string;
    surface?: "glass" | "inset";
    className?: string;
}

/** Champ de recherche : en verre posé sur la carte, en encart dans un panneau. Toute la zone donne le focus au champ. */
export function TextField({ label, surface = "inset", className = "", type = "text", ...inputProps }: TextFieldProps) {
    return (
        <label className={`${surface === "glass" ? "uf-glass" : "uf-inset"} flex min-h-[60px] cursor-text items-center gap-3 rounded-uf-panel px-5 text-uf-ink ${className}`}>
            <Search size={20} strokeWidth={2.2} aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="[font:var(--uf-note)] font-bold">{label}</span>
                <input type={type} className="min-w-0 border-0 bg-transparent p-0 [font:var(--uf-body)] text-uf-ink outline-none placeholder:text-uf-ink-2" {...inputProps} />
            </span>
        </label>
    );
}
