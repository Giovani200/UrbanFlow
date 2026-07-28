"use client";

import { useEffect } from "react";

export function InputModalityWatcher(): null {
  useEffect(() => {
    const root = document.documentElement;

    function setPointerModality(): void {
      root.dataset.inputModality = "pointer";
    }

    function setKeyboardModality(event: KeyboardEvent): void {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      root.dataset.inputModality = "keyboard";
    }

    document.addEventListener("pointerdown", setPointerModality, true);
    document.addEventListener("keydown", setKeyboardModality, true);

    return () => {
      document.removeEventListener("pointerdown", setPointerModality, true);
      document.removeEventListener("keydown", setKeyboardModality, true);
      delete root.dataset.inputModality;
    };
  }, []);

  return null;
}