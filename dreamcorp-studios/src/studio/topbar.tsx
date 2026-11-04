"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { PLANS, type PassStatus } from "@/billing/plans";

import { VIEWS, VIEW_LABELS, type GalleryView } from "./data";
import { timeLeft } from "./pass-modal";
import { AssetsIcon, HeartIcon, ImageIcon, KeyIcon, VideoIcon } from "./icons";

const VIEW_ICONS: Record<GalleryView, () => React.ReactNode> = {
  image: () => <ImageIcon />,
  video: () => <VideoIcon />,
  assets: () => <AssetsIcon />,
  favorites: () => <HeartIcon size={15} />,
};

export function Topbar({
  view,
  onView,
  busy,
  pass,
  onKeys,
}: {
  view: GalleryView;
  onView: (next: GalleryView) => void;
  busy: boolean;
  pass: PassStatus | null;
  onKeys: () => void;
}) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const active = pass?.active === true;
  const text = active
    ? `${pass.cap - pass.used} left · ${timeLeft(pass.expiresAt!)}`
    : "Get a pass";
  const label = active
    ? `${PLANS[pass.plan!].name}: ${pass.cap - pass.used} images and ${timeLeft(pass.expiresAt!)} left`
    : "Get a Day or Week Pass";
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  /* The indicator is measured rather than derived from equal columns, so it
     morphs to each label's real width instead of padding the short ones. */
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    let live = true;
    const measure = () => {
      const active = tabs.querySelector<HTMLElement>('[aria-selected="true"]');
      if (live && active) setThumb({ x: active.offsetLeft, w: active.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tabs);
    // Inter swaps in after first paint and the labels resize under it.
    void document.fonts.ready.then(measure);
    return () => {
      live = false;
      observer.disconnect();
    };
  }, [view]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const from = VIEWS.indexOf(view);
      const to =
        event.key === "ArrowRight"
          ? (from + 1) % VIEWS.length
          : event.key === "ArrowLeft"
            ? (from - 1 + VIEWS.length) % VIEWS.length
            : event.key === "Home"
              ? 0
              : event.key === "End"
                ? VIEWS.length - 1
                : -1;
      if (to < 0) return;
      event.preventDefault();
      onView(VIEWS[to]!);
      tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
    },
    [onView, view],
  );

  return (
    <div className="ohf-topbar">
      <h1 className="ohf-sr">DreamCorp Studios image studio</h1>

      <a className="ohf-bar ohf-enter-1 dc-home" href="/" aria-label="DreamCorp Studios home">
        <DreamMark />
        <span className="dc-home-text">DreamCorp</span>
      </a>

      <div className="ohf-bar ohf-enter-1">
        <div
          className="ohf-tabs"
          role="tablist"
          aria-label="Gallery scope"
          ref={tabsRef}
          onKeyDown={onKeyDown}
        >
          <span
            className="ohf-thumb"
            data-ready={thumb !== null}
            aria-hidden
            style={
              {
                "--thumb-x": `${thumb?.x ?? 0}px`,
                "--thumb-w": `${thumb?.w ?? 0}px`,
              } as React.CSSProperties
            }
          />
          {VIEWS.map((id) => {
            const selected = view === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`ohf-tab-${id}`}
                aria-selected={selected}
                aria-controls="ohf-panel"
                tabIndex={selected ? 0 : -1}
                className="ohf-tab"
                data-view={id}
                /* Favorites is the one scope that goes icon-only on a narrow
                   pill, so its name is stated rather than left to the mark. */
                aria-label={VIEW_LABELS[id]}
                title={id === "favorites" ? VIEW_LABELS[id] : undefined}
                onClick={() => onView(id)}
              >
                {VIEW_ICONS[id]()}
                <span className="ohf-tab-label">{VIEW_LABELS[id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The pass is the studio's one paid state, so it sits where the key used
          to: it says what's left and opens the pass dialog. The lamp still
          marks a run in flight. */}
      <div className="ohf-bar ohf-enter-1">
        <button
          type="button"
          className="ohf-key"
          data-busy={busy}
          data-ready={pass?.active === true}
          onClick={onKeys}
          aria-label={label}
          title={label}
        >
          <KeyIcon />
          <span className="ohf-key-text">{text}</span>
          <span className="ohf-lamp" />
        </button>
      </div>
    </div>
  );
}

/** The DreamCorp mark: a crescent cradling a spark. Also drawn in app/icon.svg. */
export function DreamMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none">
      <path
        d="M15.5 3.2A9 9 0 1 0 20.8 15 7.2 7.2 0 0 1 15.5 3.2Z"
        fill="currentColor"
      />
      <path d="M17.5 6.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" fill="var(--accent)" />
    </svg>
  );
}
