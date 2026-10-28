import { AmbianceProvider } from "@/app/components/ambiance/AmbianceContext";
import { AuthProvider } from "@/app/components/auth/AuthProvider";
import { InputModalityWatcher } from "@/app/components/a11y/InputModalityWatcher";
import { PwaInstallBanner } from "@/app/components/pwa/PwaInstallBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AmbianceProvider>
        <InputModalityWatcher />
        {children}
        <PwaInstallBanner />
      </AmbianceProvider>
    </AuthProvider>
  );
}
