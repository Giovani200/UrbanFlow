"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAmbiance } from "@/app/hooks/useAmbiance";
import type { Ambiance } from "@/app/lib/ambiance";

const AmbianceContext = createContext<Ambiance>("jour");

export function useCurrentAmbiance(): Ambiance {
    return useContext(AmbianceContext);
}

/** Ambiance de toute l'app, selon l'heure de Paris. */
export function AmbianceProvider({ children }: { children: ReactNode }) {
    const ambiance = useAmbiance();
    return <AmbianceContext.Provider value={ambiance}>{children}</AmbianceContext.Provider>;
}

/** Force une ambiance sur un bloc, quelle que soit l'heure (page de démonstration, aperçus). */
export function AmbianceScope({ ambiance, className, children }: { ambiance: Ambiance; className?: string; children: ReactNode }) {
    return (
        <AmbianceContext.Provider value={ambiance}>
            <div data-ambiance={ambiance} className={className}>
                {children}
            </div>
        </AmbianceContext.Provider>
    );
}
