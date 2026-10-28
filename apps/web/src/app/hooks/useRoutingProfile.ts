"use client";

import { useEffect, useState } from "react";
import type { RoutingProfile, TripMode } from "@urbanflow/app-front-back-lib";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { usersService } from "@/app/services/users.service";

/** Préférences d'itinéraire de l'utilisateur connecté (`undefined` pour un visiteur). */
export function useRoutingProfile(): RoutingProfile | undefined {
  const { status } = useAuth();
  const [profile, setProfile] = useState<RoutingProfile | undefined>(undefined);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    void usersService.getProfile().then((result) => {
      if (!active || !result.isOk || !result.data.preferences) return;
      const { weightCarbon, weightTime, wheelchairAccess, preferredModes } = result.data.preferences;
      setProfile({ weightCarbon, weightTime, wheelchairAccess, preferredModes: preferredModes as TripMode[] });
    });
    return () => {
      active = false;
    };
  }, [status]);

  return status === "authenticated" ? profile : undefined;
}
