"use client";

import { useState, useRef } from "react";

interface Options {
  onDismiss: () => void;
  threshold?: number;
}

export function useBottomSheetDrag({ onDismiss, threshold = 120 }: Options) {
  const [dragY, setDragY]     = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartY             = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setDragY(delta);
  }

  function onTouchEnd() {
    setDragging(false);
    if (dragY > threshold) {
      setDragY(0);
      onDismiss();
    } else {
      setDragY(0);
    }
  }

  return { dragY, dragging, onTouchStart, onTouchMove, onTouchEnd };
}
