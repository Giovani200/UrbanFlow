"use client";

import type { ReactNode } from "react";
import { AmbianceScope } from "@/app/components/ambiance/AmbianceContext";
import { FreshnessStamp } from "@/app/components/ui/FreshnessStamp";
import { LinePlate } from "@/app/components/ui/LinePlate";
import { RouteTrace } from "@/app/components/ui/RouteTrace";
import { StopNode } from "@/app/components/ui/StopNode";
import { TimeCell } from "@/app/components/ui/TimeCell";
import type { Ambiance } from "@/app/lib/ambiance";

const AMBIANCES: Ambiance[] = ["aube", "jour", "crepuscule", "nuit"];

const LINES = [
    { code: "3601", color: "#FF5A00", label: "Bus 3601" },
    { code: "R", color: "#F49FB3", label: "Ligne R" },
    { code: "A", color: "#EB2132", label: "RER A" },
    { code: "D", color: "#008B5B", label: "RER D" },
    { code: "1", color: "#FFBE00", label: "Métro 1" },
    { code: "B", color: "#5091CB", label: "RER B" },
    { code: "14", color: "#640082", label: "Métro 14" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <h3 className="[font:var(--uf-time)] text-uf-ink">{title}</h3>
            {children}
        </section>
    );
}

function AmbianceColumn({ ambiance }: { ambiance: Ambiance }) {
    return (
        <AmbianceScope ambiance={ambiance} className="rounded-uf-panel p-4 [background:var(--uf-bg)]">
            <div
                className="flex flex-col gap-6 rounded-uf-panel border border-uf-glass-edge bg-uf-glass p-5 text-uf-ink [box-shadow:var(--uf-glass-shadow)] [backdrop-filter:blur(var(--uf-glass-blur))_saturate(var(--uf-glass-saturate))]"
            >
                <h2 className="[font:var(--uf-title)] tracking-[var(--uf-title-tracking)]">{ambiance}</h2>

                <Section title="Plaques">
                    <div className="flex flex-wrap items-center gap-2">
                        {LINES.map((line) => (
                            <LinePlate key={line.code} {...line} />
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {LINES.slice(0, 3).map((line) => (
                            <LinePlate key={line.code} {...line} size="s" />
                        ))}
                        <LinePlate code="3601" color="#FF5A00" label="Bus 3601" interrupted />
                    </div>
                </Section>

                <Section title="Tracés">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 [font:var(--uf-note)]">
                        <RouteTrace state="realtime" color="#FF5A00" />
                        <span>temps réel</span>
                        <RouteTrace state="scheduled" color="#EB2132" />
                        <span>horaire prévu</span>
                        <RouteTrace state="walk" />
                        <span>à pied</span>
                        <RouteTrace state="interrupted" color="#FF5A00" />
                        <span>interrompu</span>
                        <RouteTrace state="realtime" color="#F49FB3" />
                        <span>ligne R</span>
                    </div>
                    <div className="flex h-24 gap-6">
                        <RouteTrace state="realtime" color="#F49FB3" orientation="vertical" />
                        <RouteTrace state="scheduled" color="#EB2132" orientation="vertical" />
                        <RouteTrace state="walk" orientation="vertical" />
                    </div>
                </Section>

                <Section title="Nœuds">
                    <div className="flex items-center gap-6 [font:var(--uf-note)]">
                        <span className="flex items-center gap-2"><StopNode kind="origin" />origine</span>
                        <span className="flex items-center gap-2"><StopNode kind="stop" />arrêt</span>
                        <span className="flex items-center gap-2"><StopNode kind="transfer" />correspondance</span>
                        <span className="flex items-center gap-2"><StopNode kind="destination" />destination</span>
                    </div>
                </Section>

                <Section title="Heures">
                    <div className="grid grid-cols-4 items-end gap-3">
                        <TimeCell scheduledTime="08:12" />
                        <TimeCell scheduledTime="07:41" expectedTime="07:45" delayMinutes={4} />
                        <TimeCell scheduledTime="08:30" expectedTime="08:28" delayMinutes={-2} />
                        <TimeCell scheduledTime="08:42" cancelled />
                    </div>
                </Section>

                <Section title="Fraîcheur">
                    <div className="flex flex-col gap-2">
                        <FreshnessStamp freshness="realtime" ageSeconds={40} />
                        <FreshnessStamp freshness="scheduled" />
                        <FreshnessStamp freshness="stale" />
                    </div>
                </Section>
            </div>
        </AmbianceScope>
    );
}

export function DesignSystemShowcase() {
    return (
        <div className="min-h-full bg-white p-4 md:p-8">
            <h1 className="mb-6 font-uf-display text-2xl font-semibold text-[#0F2238]">Design system UrbanFlow</h1>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {AMBIANCES.map((ambiance) => (
                    <AmbianceColumn key={ambiance} ambiance={ambiance} />
                ))}
            </div>
        </div>
    );
}
