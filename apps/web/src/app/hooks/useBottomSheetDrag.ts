"use client";

import { useState, useRef, useCallback } from "react";

interface Options {
  onDismiss?: () => void;
  collapsible?: boolean;
  threshold?: number;
}

export function useBottomSheetDrag({ onDismiss, collapsible = false, threshold = 120 }: Options) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const startY = useRef(0);

  const handleStart = useCallback((clientY: number) => {
    startY.current = clientY;
    setDragging(true);
  }, []);

  const handleMove = useCallback((clientY: number) => {
    const delta = clientY - startY.current;
    setDragY(collapsed ? Math.min(0, delta) : Math.max(0, delta));
  }, [collapsed]);

  const handleEnd = useCallback(() => {
    setDragging(false);
    const delta = dragY;
    setDragY(0);
    if (collapsible) {
      if (!collapsed && delta > threshold) setCollapsed(true);
      else if (collapsed && delta < -threshold) setCollapsed(false);
    } else if (delta > threshold) {
      onDismiss?.();
    }
  }, [dragY, collapsed, collapsible, threshold, onDismiss]);

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
    collapsed,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
  };
}