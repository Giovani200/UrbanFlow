import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FreshnessStamp } from "./FreshnessStamp";
import { RouteTrace } from "./RouteTrace";
import { StopNode } from "./StopNode";
import { TimeCell } from "./TimeCell";

describe("RouteTrace", () => {
    it("n'anime que le tracé en temps réel", () => {
        const { container } = render(
            <>
                <RouteTrace state="realtime" color="#FF5A00" />
                <RouteTrace state="scheduled" color="#EB2132" />
                <RouteTrace state="interrupted" color="#FF5A00" />
                <RouteTrace state="walk" />
            </>,
        );

        const animated = container.querySelectorAll(".uf-reflet-horizontal, .uf-reflet-vertical");
        expect(animated).toHaveLength(1);
        expect((animated[0] as HTMLElement).dataset.state).toBe("realtime");
    });

    it("dessine l'horaire prévu en tirets et le vertical avec le bon reflet", () => {
        const { container } = render(
            <>
                <RouteTrace state="scheduled" color="#EB2132" />
                <RouteTrace state="realtime" color="#FF5A00" orientation="vertical" />
            </>,
        );

        const [scheduled, vertical] = Array.from(container.querySelectorAll<HTMLElement>("[data-state]"));
        expect(scheduled.style.backgroundImage).toContain("repeating-linear-gradient");
        expect(vertical.className).toContain("uf-reflet-vertical");
    });

    it("est décoratif pour les lecteurs d'écran", () => {
        const { container } = render(<RouteTrace state="realtime" color="#FF5A00" />);
        expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
    });
});

describe("StopNode", () => {
    it.each(["origin", "stop", "transfer", "destination"] as const)("dessine le nœud %s", (kind) => {
        const { container } = render(<StopNode kind={kind} />);
        expect((container.firstElementChild as HTMLElement).dataset.kind).toBe(kind);
    });
});

describe("TimeCell", () => {
    it("affiche « à l'heure » sans écart", () => {
        render(<TimeCell scheduledTime="08:12" />);
        expect(screen.getByText("08:12")).toBeTruthy();
        expect(screen.getByText("à l'heure")).toBeTruthy();
    });

    it("en retard, garde l'heure prévue barrée au-dessus de l'heure estimée", () => {
        const { container } = render(<TimeCell scheduledTime="07:41" expectedTime="07:45" delayMinutes={4} />);

        expect(container.querySelector("s")?.textContent).toBe("prévu 07:41");
        expect(screen.getByText("07:45")).toBeTruthy();
        expect(screen.getByText("+4 min")).toBeTruthy();
    });

    it("en avance, écrit l'écart avec un vrai signe moins", () => {
        render(<TimeCell scheduledTime="08:30" expectedTime="08:28" delayMinutes={-2} />);
        expect(screen.getByText("−2 min")).toBeTruthy();
    });

    it("barre une heure supprimée et l'écrit", () => {
        const { container } = render(<TimeCell scheduledTime="08:42" cancelled />);
        expect(container.querySelector("s")?.textContent).toBe("08:42");
        expect(screen.getByText("supprimé")).toBeTruthy();
    });
});

describe("FreshnessStamp", () => {
    it("dit l'âge d'une donnée en temps réel", () => {
        render(<FreshnessStamp freshness="realtime" ageSeconds={40} />);
        expect(screen.getByText("temps réel · il y a 40 s")).toBeTruthy();
    });

    it("passe aux minutes au-delà d'une minute", () => {
        render(<FreshnessStamp freshness="realtime" ageSeconds={95} />);
        expect(screen.getByText("temps réel · il y a 1 min")).toBeTruthy();
    });

    it("dit « horaire prévu » et « temps réel ancien »", () => {
        render(
            <>
                <FreshnessStamp freshness="scheduled" />
                <FreshnessStamp freshness="stale" />
            </>,
        );
        expect(screen.getByText("horaire prévu")).toBeTruthy();
        expect(screen.getByText("temps réel ancien · traité comme prévu")).toBeTruthy();
    });
});
