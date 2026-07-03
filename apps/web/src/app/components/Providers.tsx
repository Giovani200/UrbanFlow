import { AuthProvider } from "@/app/components/auth/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
