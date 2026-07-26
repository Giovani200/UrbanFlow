"use client";

import { useEffect, useRef } from "react";

export function useEscapeKey(onEscape: () => void): void {
  const handlerRef = useRef(onEscape);

  useEffect(() => {
    handlerRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") handlerRef.current();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}