"use client";

import { useState, useRef, useCallback } from "react";

interface Options {
  onDismiss: () => void;
  threshold?: number;
}

export function useBottomSheetDrag({ onDismiss, threshold = 120 }: Options) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  const handleStart = useCallback((clientY: number) => {
    startY.current = clientY;
    setDragging(true);
  }, []);

  const handleMove = useCallback((clientY: number) => {
    const delta = clientY - startY.current;
    if (delta > 0) setDragY(delta);
  }, []);

  const handleEnd = useCallback(() => {
    setDragging(false);
    if (dragY > threshold) {
      setDragY(0);
      onDismiss();
    } else {
      setDragY(0);
    }
  }, [dragY, threshold, onDismiss]);

  const onTouchStart = useCallback((e: React.TouchEvent) => handleStart(e.touches[0].clientY), [handleStart]);
  const onTouchMove = useCallback((e: React.TouchEvent) => handleMove(e.touches[0].clientY), [handleMove]);
  const onTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientY);
  }, [handleStart]);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) handleMove(e.clientY);
  }, [dragging, handleMove]);
  const onMouseUp = useCallback(() => {
    if (dragging) handleEnd();
  }, [dragging, handleEnd]);
  const onMouseLeave = useCallback(() => {
    if (dragging) handleEnd();
  }, [dragging, handleEnd]);

  return {
    dragY,
    dragging,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };
}