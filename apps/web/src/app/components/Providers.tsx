import { AuthProvider } from "@/app/components/auth/AuthProvider";
import { InputModalityWatcher } from "@/app/components/a11y/InputModalityWatcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <InputModalityWatcher />
      {children}
    </AuthProvider>
  );
}
