"use client";

import { useEffect, useRef } from "react";

import { PLANS, PLAN_IDS, formatPrice, type PassStatus } from "@/billing/plans";
import { logout } from "@/server/session-actions";

import { CloseIcon } from "./icons";

/* The account dialog. Signed out: log in or buy a pass. Signed in: what's
   left on the pass, plus sign-out. Every buy button is a real form post to
   /api/checkout, so the dialog carries no payment code of its own. */
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

  const signedIn = status?.signedIn === true;
  const active = status?.active === true;
  const ended = signedIn && !active;
  const title = !signedIn
    ? "Log in to generate"
    : reason === "limit" || status?.reason === "limit"
      ? "You've used this pass up"
      : ended
        ? "Your pass has ended"
        : `Signed in as ${status!.username}`;
  const copy = !signedIn
    ? "Bought a pass? Log in with the details you were given. New here? A pass takes under a minute."
    : ended
      ? "Start a new pass to keep generating. Your gallery stays in this browser."
      : status!.unlimited
        ? `${status!.role === "admin" ? "Admin" : "Developer"} access. No image limit${status!.expiresAt ? `, ${timeLeft(status!.expiresAt)} left` : ""}.`
        : `${PLANS[status!.plan!].name}. ${status!.used} of ${status!.cap} images used, ${timeLeft(status!.expiresAt!)} left.`;

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

        {(!signedIn || ended) && (
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

        <div className="dc-pass-foot">
          {!signedIn ? (
            <a className="ohf-btn-quiet" href="/login?next=/studio">
              I have a login
            </a>
          ) : (
            <>
              {status!.role === "admin" && (
                <a className="ohf-btn-quiet" href="/admin">
                  Open admin
                </a>
              )}
              <form action={logout}>
                <button type="submit" className="ohf-btn-quiet">
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
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
