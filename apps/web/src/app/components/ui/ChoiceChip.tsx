import type { ButtonHTMLAttributes } from "react";

interface ChoiceChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  selected: boolean;
}

/** Choix à bascule (filtre, période, mode) : l'état se lit par le fond plein et par `aria-pressed`, pas par une couleur. */
export function ChoiceChip({ selected, className = "", ...rest }: ChoiceChipProps) {
  const surface = selected ? "bg-uf-ink text-uf-on-ink" : "uf-inset text-uf-ink";
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`${surface} inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 [font:var(--uf-note)] ${className}`}
      {...rest}
    />
  );
}
