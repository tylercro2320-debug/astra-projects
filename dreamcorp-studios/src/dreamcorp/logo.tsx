"use client";

import { useEffect, useRef } from "react";

/* The DreamCorp logo: a crescent moon set inside a film reel, with a marigold
   spark. The intro runs in CSS (landing.css) so it plays on first paint with
   no flash: the reel spins in like a projector spooling up, the wordmark is
   cut in letter by letter like edit splices, and a slate bar snaps across.
   GSAP, loaded lazily, only adds the hover spin. Reduced motion skips both. */

const WORD = "DreamCorp";

export function DreamLogo({ intro = true, size = 34 }: { intro?: boolean; size?: number }) {
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cleanup = () => {};
    let alive = true;

    void import("gsap").then(({ gsap }) => {
      if (!alive || reduce) return;
      const reel = el.querySelector(".dc-logo-reel");
      const spin = () => gsap.to(reel, { rotation: "+=360", duration: 1.1, ease: "power3.inOut", overwrite: "auto" });
      el.addEventListener("pointerenter", spin);
      cleanup = () => el.removeEventListener("pointerenter", spin);
    });

    return () => {
      alive = false;
      cleanup();
    };
  }, []);

  return (
    <span ref={root} className="dc-logo" data-intro={intro} aria-label="DreamCorp Studios">
      <svg className="dc-logo-reel" width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
        {[0, 72, 144, 216, 288].map((deg) => (
          <circle
            key={deg}
            cx={24 + 15.5 * Math.cos((deg * Math.PI) / 180)}
            cy={24 + 15.5 * Math.sin((deg * Math.PI) / 180)}
            r="3"
            fill="currentColor"
            fillOpacity="0.28"
          />
        ))}
        <path d="M27.4 13.4A11 11 0 1 0 35 30.2 8.8 8.8 0 0 1 27.4 13.4Z" fill="currentColor" />
        <path d="M31 17l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="var(--marigold, #ffc857)" />
      </svg>
      <span className="dc-logo-type">
        <span className="dc-logo-word" aria-hidden>
          {WORD.split("").map((ch, i) => (
            <span key={i} className="dc-logo-letter" style={{ "--i": i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
          <span className="dc-logo-slate" />
        </span>
        <span className="dc-logo-sub" aria-hidden>
          Studios
        </span>
      </span>
    </span>
  );
}
