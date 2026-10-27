"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { AccountDialog } from "@/app/components/profile/AccountDialog";
import { FavoriteAddressesSection } from "@/app/components/profile/FavoriteAddressesSection";
import { ProfileHeader } from "@/app/components/profile/ProfileHeader";
import { TravelPreferencesSection } from "@/app/components/profile/TravelPreferencesSection";
import { PageShell } from "@/app/components/ui/PageShell";
import { useCarbonSummary } from "@/app/hooks/useCarbonSummary";
import { usersService, type GetUserProfileDtoOut } from "@/app/services/users.service";

/** Profil : charge le compte une fois, puis assemble les sections. Chaque section gère ses propres modifications. */
export default function ProfilePage() {
  const router = useRouter();
  const { status } = useAuth();
  const { summary } = useCarbonSummary("month");
  const [profile, setProfile] = useState<GetUserProfileDtoOut | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }
    if (status !== "authenticated") return;
    void usersService.getProfile().then((result) => {
      if (result.isOk) setProfile(result.data);
    });
  }, [status, router]);

  return (
    <PageShell title="Ton profil">
      {profile ? (
        <>
          <ProfileHeader name={profile.name} email={profile.email} monthSummary={summary} onOpenAccount={() => setAccountOpen(true)} />
          <FavoriteAddressesSection />
          <TravelPreferencesSection preferences={profile.preferences} />
          <AccountDialog
            open={accountOpen}
            onOpenChange={setAccountOpen}
            email={profile.email}
            name={profile.name}
            hasPassword={profile.hasPassword}
            onNameChanged={(name) => setProfile({ ...profile, name })}
          />
        </>
      ) : (
        <p role="status" className="px-1 [font:var(--uf-body)] font-medium text-uf-ink-2">
          Chargement du profil…
        </p>
      )}
    </PageShell>
  );
}
