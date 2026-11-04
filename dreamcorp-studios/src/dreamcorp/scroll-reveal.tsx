"use client";

import { useEffect } from "react";

/* One scroll-driven moment for the page: the pass tickets are dealt onto the
   table as they scroll in, and section headings rise once. Everything is
   visible without JavaScript; GSAP only adds the entrance. ScrollTrigger.batch
   keeps it to one observer for all targets. Reduced motion skips it. */
export function ScrollReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let revert = () => {};
    let alive = true;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (!alive) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight * 0.9;
        const reveal = gsap.utils.toArray<HTMLElement>("[data-reveal]").filter(below);
        gsap.set(reveal, { autoAlpha: 0, y: 28 });
        ScrollTrigger.batch(reveal, {
          start: "top 88%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }),
        });

        const deal = gsap.utils.toArray<HTMLElement>("[data-deal]").filter(below);
        gsap.set(deal, { autoAlpha: 0, y: 80, rotation: (i: number) => (i % 2 ? 9 : -9) });
        ScrollTrigger.batch(deal, {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              rotation: (i: number) => (i % 2 ? 1.5 : -1.5),
              duration: 1.1,
              ease: "expo.out",
              stagger: 0.14,
            }),
        });
      });
      revert = () => ctx.revert();
    });
    return () => {
      alive = false;
      revert();
    };
  }, []);
  return null;
}
