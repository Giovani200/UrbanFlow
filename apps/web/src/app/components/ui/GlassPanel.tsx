import type { HTMLAttributes, ReactNode } from "react";

type GlassElement = "div" | "section" | "aside" | "header" | "nav";

interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
    variant?: "panel" | "inset";
    as?: GlassElement;
    children: ReactNode;
}

/** Panneau de verre (posé sur la carte ou le fond) ou encart (posé dans un panneau). */
export function GlassPanel({ variant = "panel", as: Element = "div", className = "", children, ...rest }: GlassPanelProps) {
    const surface = variant === "panel" ? "uf-glass rounded-uf-panel" : "uf-inset rounded-uf-inset";
    return (
        <Element className={`${surface} text-uf-ink ${className}`} {...rest}>
            {children}
        </Element>
    );
}
