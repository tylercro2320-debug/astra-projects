"use client";

import { useEffect } from "react";

/** Marks the header as scrolled so it gains its glass backing. One passive listener, no layout reads beyond scrollY. */
export function HeaderScroll() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".dc-header");
    if (!header) return;
    let ticking = false;
    const update = () => {
      header.dataset.scrolled = String(window.scrollY > 12);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
