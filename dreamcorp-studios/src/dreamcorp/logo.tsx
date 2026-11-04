"use client";

import { useEffect, useRef, useState } from "react";

/* The DreamCorp logo. The mark is a Three.js film reel with a 3D crescent moon
   (see logo-3d.ts); the flat SVG version shows first and stays as the
   fallback if WebGL is unavailable. The wordmark is cut in letter by letter
   in CSS (landing.css) so it plays on first paint, with a slate bar snapping
   across at the end. Hover or tap spins the reel up. */

const WORD = "DreamCorp";

export function DreamLogo({ intro = true, size = 34 }: { intro?: boolean; size?: number }) {
  const root = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = root.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    let alive = true;
    let handle: { boost(): void; dispose(): void } | null = null;
    const boost = () => handle?.boost();

    void Promise.all([import("three"), import("./logo-3d")])
      .then(([THREE, { mountLogo3D }]) => {
        if (!alive) return;
        try {
          handle = mountLogo3D(THREE, canvas, { intro });
          setReady(true);
        } catch {
          // No WebGL: the SVG mark stays.
        }
      })
      .catch(() => undefined);

    el.addEventListener("pointerenter", boost);
    el.addEventListener("pointerdown", boost);
    return () => {
      alive = false;
      el.removeEventListener("pointerenter", boost);
      el.removeEventListener("pointerdown", boost);
      handle?.dispose();
    };
  }, [intro]);

  const box = Math.round(size * 1.35);
  return (
    <span ref={root} className="dc-logo" data-intro={intro} data-3d={ready} aria-label="DreamCorp Studios">
      <span className="dc-logo-mark" style={{ width: box, height: box }}>
        <svg className="dc-logo-reel" width={size} height={size} viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <circle
              key={deg}
              cx={(24 + 15.5 * Math.cos((deg * Math.PI) / 180)).toFixed(2)}
              cy={(24 + 15.5 * Math.sin((deg * Math.PI) / 180)).toFixed(2)}
              r="3"
              fill="currentColor"
              fillOpacity="0.28"
            />
          ))}
          <path d="M27.4 13.4A11 11 0 1 0 35 30.2 8.8 8.8 0 0 1 27.4 13.4Z" fill="currentColor" />
          <path d="M31 17l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="var(--marigold, #ffc857)" />
        </svg>
        <canvas ref={canvasRef} className="dc-logo-canvas" aria-hidden />
      </span>
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
