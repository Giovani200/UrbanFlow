"use client";

import { useRef, useState, type ReactNode } from "react";
import { DRAG_THRESHOLD_PIXELS, nextPositionOnToggle, positionAfterDrag, type SheetPosition } from "@/app/lib/sheet-position";

const SHEET_HEIGHT = "86dvh";
const PEEK_HEIGHT = "104px";
const HALF_HEIGHT = "48dvh";

const OFFSETS: Record<SheetPosition, string> = {
  expanded: "0px",
  half: `calc(${SHEET_HEIGHT} - ${HALF_HEIGHT})`,
  collapsed: `calc(${SHEET_HEIGHT} - ${PEEK_HEIGHT})`,
};

const POSITION_LABELS: Record<SheetPosition, string> = {
  collapsed: "replié",
  half: "à mi-hauteur",
  expanded: "déplié",
};

interface BottomSheetProps {
  label: string;
  position: SheetPosition;
  onPositionChange: (position: SheetPosition) => void;
  bottomOffset?: number;
  children: ReactNode;
}

/** Panneau de verre qui glisse sur la carte : replié (la carte est libre), à mi-hauteur, déplié. Un bouton fait la même chose sans glisser. */
export function BottomSheet({ label, position, onPositionChange, bottomOffset = 0, children }: BottomSheetProps) {
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
      className="uf-glass fixed inset-x-0 z-30 flex flex-col rounded-t-uf-panel text-uf-ink motion-safe:transition-transform motion-safe:duration-300"
      style={{
        bottom: bottomOffset,
        height: SHEET_HEIGHT,
        transform: `translateY(calc(${OFFSETS[position]} + ${dragDeltaY}px))`,
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">{children}</div>
    </section>
  );
}
