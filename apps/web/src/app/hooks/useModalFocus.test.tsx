import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useModalFocus } from "./useModalFocus";

function ModalHarness() {
    const dialogRef = useModalFocus<HTMLDivElement>();

    return (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Test" tabIndex={-1}>
            <button>premier</button>
            <button>second</button>
        </div>
    );
}

afterEach(() => {
    cleanup();
});

describe("useModalFocus", () => {
    it("place le focus sur le premier élément focusable à l'ouverture", () => {
        const { getByText } = render(<ModalHarness />);

        expect(document.activeElement).toBe(getByText("premier"));
    });

    it("boucle du dernier vers le premier avec Tab", () => {
        const { getByText } = render(<ModalHarness />);
        const second = getByText("second");

        second.focus();
        fireEvent.keyDown(second, { key: "Tab" });

        expect(document.activeElement).toBe(getByText("premier"));
    });

    it("boucle du premier vers le dernier avec Maj+Tab", () => {
        const { getByText } = render(<ModalHarness />);
        const premier = getByText("premier");

        premier.focus();
        fireEvent.keyDown(premier, { key: "Tab", shiftKey: true });

        expect(document.activeElement).toBe(getByText("second"));
    });

    it("laisse passer les touches autres que Tab", () => {
        const { getByText } = render(<ModalHarness />);
        const second = getByText("second");

        second.focus();
        fireEvent.keyDown(second, { key: "ArrowDown" });

        expect(document.activeElement).toBe(second);
    });

    it("rend le focus à l'élément déclencheur à la fermeture", () => {
        const trigger = document.createElement("button");
        document.body.appendChild(trigger);
        trigger.focus();

        const { unmount } = render(<ModalHarness />);
        expect(document.activeElement).not.toBe(trigger);

        unmount();

        expect(document.activeElement).toBe(trigger);
        trigger.remove();
    });
});
