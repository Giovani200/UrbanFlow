import { Eye, EyeOff } from "lucide-react";

interface PasswordVisibilityToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export function PasswordVisibilityToggle({ visible, onToggle }: PasswordVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      aria-pressed={visible}
      className="flex size-11 shrink-0 items-center justify-center rounded-full"
    >
      {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );
}
