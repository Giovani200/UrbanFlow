"use client";

import { useRef, useState, type ReactNode } from "react";
import { DRAG_THRESHOLD_PIXELS, nextPositionOnToggle, positionAfterDrag, type SheetPosition } from "@/app/lib/sheet-position";

const MAX_SHEET_HEIGHT = "86dvh";

const VISIBLE_HEIGHTS: Record<SheetPosition, string> = {
  expanded: MAX_SHEET_HEIGHT,
  half: "48dvh",
  collapsed: "104px",
};

/**
 * Décalage vers le bas pour ne montrer que la hauteur voulue, glissement en cours compris.
 * Jamais négatif : le panneau reste collé au bas de l'écran, même tiré vers le haut au-delà de son contenu.
 */
function translateFor(position: SheetPosition, dragDeltaY: number): string {
  const restingOffset = `max(0px, 100% - ${VISIBLE_HEIGHTS[position]})`;
  return `max(0px, ${restingOffset} + ${dragDeltaY}px)`;
}

const POSITION_LABELS: Record<SheetPosition, string> = {
  collapsed: "replié",
  half: "à mi-hauteur",
  expanded: "déplié",
};

interface BottomSheetProps {
  label: string;
  position: SheetPosition;
  onPositionChange: (position: SheetPosition) => void;
  children: ReactNode;
}

/**
 * Panneau de verre qui glisse sur la carte : replié (la carte est libre), à mi-hauteur, déplié. Un bouton fait la même chose sans glisser.
 * Sa hauteur suit son contenu, dans la limite de 86 % de l'écran : déplié, il ne laisse jamais de vide sous le contenu.
 */
export function BottomSheet({ label, position, onPositionChange, children }: BottomSheetProps) {
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const suppressNextClick = useRef(false);

  function startDrag(clientY: number) {
    dragStartY.current = clientY;
    setDragging(true);
  }

  function moveDrag(clientY: number) {
    if (dragStartY.current !== null) setDragDeltaY(clientY - dragStartY.current);
  }

  function endDrag() {
    if (dragStartY.current === null) return;
    suppressNextClick.current = Math.abs(dragDeltaY) >= DRAG_THRESHOLD_PIXELS;
    onPositionChange(positionAfterDrag(position, dragDeltaY));
    dragStartY.current = null;
    setDragging(false);
    setDragDeltaY(0);
  }

  function handleToggleClick() {
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    onPositionChange(nextPositionOnToggle(position));
  }

  return (
    <section
      aria-label={label}
      className="uf-glass fixed inset-x-0 bottom-0 z-30 flex flex-col rounded-t-uf-panel text-uf-ink motion-safe:transition-transform motion-safe:duration-300"
      style={{
        maxHeight: MAX_SHEET_HEIGHT,
        transform: `translateY(${translateFor(position, dragDeltaY)})`,
        transitionDuration: dragging ? "0ms" : undefined,
      }}
    >
      <div
        className="flex shrink-0 touch-none items-center justify-center pt-2"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          startDrag(event.clientY);
        }}
        onPointerMove={(event) => moveDrag(event.clientY)}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <button
          type="button"
          onClick={handleToggleClick}
          aria-label={`Panneau ${POSITION_LABELS[position]}. Changer la taille du panneau`}
          className="flex h-11 w-20 cursor-grab items-center justify-center"
        >
          <span className="h-1.5 w-10 rounded-full bg-uf-ink/25" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </section>
  );
}
