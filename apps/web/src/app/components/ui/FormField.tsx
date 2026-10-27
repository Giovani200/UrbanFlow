import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> {
  label: string;
  /** Contrôle posé au bout du champ, par exemple « afficher le mot de passe ». */
  trailing?: ReactNode;
  className?: string;
}

/** Champ de formulaire en encart, avec son libellé visible au-dessus. */
export function FormField({ label, trailing, className = "", ...inputProps }: FormFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="px-1 [font:var(--uf-note)]">
        {label}
      </label>
      <div className="uf-inset flex min-h-11 items-center rounded-uf-chip pr-1 pl-4">
        <input
          id={id}
          className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-0 [font:var(--uf-body)] font-medium text-uf-ink outline-none placeholder:text-uf-ink-2"
          {...inputProps}
        />
        {trailing}
      </div>
    </div>
  );
}
