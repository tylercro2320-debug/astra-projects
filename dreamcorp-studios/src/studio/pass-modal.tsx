"use client";

import { useEffect, useRef } from "react";

import { PLANS, PLAN_IDS, formatPrice, type PassStatus } from "@/billing/plans";

import { CloseIcon } from "./icons";

/* Replaces the original bring-your-own-key modal. DreamCorp holds the platform
   key; the visitor buys time. Each card is a real form post to /api/checkout,
   so the dialog needs no client-side payment code at all. */
export function PassModal({
  status,
  reason,
  onClose,
}: {
  status: PassStatus | null;
  reason: "needed" | "limit" | "info";
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.showModal();
    panelRef.current?.focus();
  }, []);

  const active = status?.active === true;
  const title = reason === "limit" ? "You've used this pass up" : active ? "Your pass" : "Get a pass to generate";
  const copy =
    reason === "limit"
      ? `This pass covered ${status?.cap ?? 0} images. Start another to keep going.`
      : active
        ? `${PLANS[status.plan!].name}. ${status.used} of ${status.cap} images used, ${timeLeft(status.expiresAt!)} left.`
        : "Pay once, generate until it runs out. No subscription and nothing renews.";

  return (
    <dialog
      ref={ref}
      aria-labelledby="dc-pass-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div ref={panelRef} tabIndex={-1} className="ohf-dialog-panel ohf-keys-panel dc-pass-panel">
        <div className="ohf-keys-head">
          <div>
            <div id="dc-pass-title" className="ohf-keys-title">
              {title}
            </div>
            <p className="ohf-keys-copy">{copy}</p>
          </div>
          <button type="button" className="ohf-icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={13} />
          </button>
        </div>

        {(!active || reason === "limit") && (
          <div className="dc-pass-options">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              return (
                <form key={id} method="post" action="/api/checkout" className="dc-pass-option">
                  <input type="hidden" name="plan" value={id} />
                  <span className="dc-pass-name">{plan.name}</span>
                  <span className="dc-pass-price">{formatPrice(plan.cents)}</span>
                  <span className="dc-pass-per">{plan.per}</span>
                  <button type="submit" className="ohf-keys-save">
                    Buy {plan.name}
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </div>
    </dialog>
  );
}

export function timeLeft(expiresAt: number): string {
  const minutes = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
