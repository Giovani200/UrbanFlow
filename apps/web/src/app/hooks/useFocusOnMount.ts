"use client";

import { useEffect, useRef } from "react";

export function useFocusOnMount<T extends HTMLElement>() {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    elementRef.current?.focus();
  }, []);

  return elementRef;
}