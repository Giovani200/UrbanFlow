import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AmbianceScope } from "@/app/components/ambiance/AmbianceContext";
import { LinePlate } from "./LinePlate";

describe("LinePlate", () => {
    it("affiche le code avec un libellé accessible", () => {
        render(<LinePlate code="3601" color="#FF5A00" label="Bus 3601" />);

        const plate = screen.getByRole("img", { name: "Bus 3601" });
        expect(plate.textContent).toBe("3601");
        expect(plate.style.color).toBe("rgb(15, 34, 56)");
        expect(plate.style.fontSize).toBe("14px");
    });

    it("passe le code en blanc et en 19 px pour le RER A", () => {
        render(<LinePlate code="A" color="#EB2132" label="RER A" />);

        const plate = screen.getByRole("img", { name: "RER A" });
        expect(plate.style.color).toBe("rgb(255, 255, 255)");
        expect(plate.style.fontSize).toBe("19px");
    });

    it("garde le code en 12 px sur une petite plaque, même pour une ligne rouge", () => {
        render(<LinePlate code="3604" color="#FF1400" label="Bus 3604" size="s" />);

        expect(screen.getByRole("img", { name: "Bus 3604" }).style.fontSize).toBe("12px");
    });

    it("ajoute un liseré à la ligne R sur le verre de jour, pas au crépuscule", () => {
        const { unmount } = render(
            <AmbianceScope ambiance="jour">
                <LinePlate code="R" color="#F49FB3" label="Ligne R" />
            </AmbianceScope>,
        );
        expect(screen.getByRole("img", { name: "Ligne R" }).style.boxShadow).toContain("0 0 0 1px");
        unmount();

        render(
            <AmbianceScope ambiance="crepuscule">
                <LinePlate code="R" color="#F49FB3" label="Ligne R" />
            </AmbianceScope>,
        );
        expect(screen.getByRole("img", { name: "Ligne R" }).style.boxShadow).not.toContain("0 0 0 1px");
    });

    it("écrit le mot « interrompue » et barre le code d'une ligne interrompue", () => {
        render(<LinePlate code="3601" color="#FF5A00" label="Bus 3601" interrupted />);

        expect(screen.getByRole("img", { name: "Bus 3601, interrompue" }).style.textDecoration).toBe("line-through");
        expect(screen.getByText("interrompue")).toBeTruthy();
    });
});
