export type SheetPosition = "collapsed" | "half" | "expanded";

const ORDER: SheetPosition[] = ["collapsed", "half", "expanded"];
export const DRAG_THRESHOLD_PIXELS = 60;

/** Position après un glissement : vers le haut (delta négatif) on monte d'un cran, vers le bas on descend. */
export function positionAfterDrag(current: SheetPosition, dragDeltaY: number): SheetPosition {
  const index = ORDER.indexOf(current);
  if (dragDeltaY <= -DRAG_THRESHOLD_PIXELS) return ORDER[Math.min(index + 1, ORDER.length - 1)];
  if (dragDeltaY >= DRAG_THRESHOLD_PIXELS) return ORDER[Math.max(index - 1, 0)];
  return current;
}

/** Position suivante pour le bouton (sans glisser) : on monte jusqu'en haut, puis on replie. */
export function nextPositionOnToggle(current: SheetPosition): SheetPosition {
  return current === "expanded" ? "collapsed" : ORDER[ORDER.indexOf(current) + 1];
}
