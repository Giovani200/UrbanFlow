import { AmbianceSync } from "@/app/components/ambiance/AmbianceSync";
import { AuthProvider } from "@/app/components/auth/AuthProvider";
import { InputModalityWatcher } from "@/app/components/a11y/InputModalityWatcher";
import { PwaInstallBanner } from "@/app/components/pwa/PwaInstallBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AmbianceSync />
      <InputModalityWatcher />
      {children}
      <PwaInstallBanner />
    </AuthProvider>
  );
}
