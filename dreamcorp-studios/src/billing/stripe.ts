import "server-only";

import { PLANS, isPlanId, type PlanId } from "./plans";

/* Stripe Checkout over plain fetch. It's two calls, so no SDK dependency.
   One-time payments (mode=payment): a pass is bought, not subscribed to, so
   nothing renews behind anyone's back. */

const API = "https://api.stripe.com/v1";

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Demo checkout grants a pass without payment. It never runs when Stripe is configured. */
export function demoCheckoutEnabled(): boolean {
  return !stripeEnabled() && process.env.DREAMCORP_DEMO_CHECKOUT === "1";
}

function auth() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return { Authorization: `Bearer ${key}` };
}

export async function createCheckoutSession(plan: PlanId, origin: string): Promise<string> {
  const p = PLANS[plan];
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(p.cents),
    "line_items[0][price_data][product_data][name]": `DreamCorp Studios ${p.name}`,
    "line_items[0][price_data][product_data][description]": `Image generation ${p.per}. One-time payment, no subscription.`,
    "metadata[plan]": plan,
    success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#passes`,
  });
  const response = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  const json = (await response.json()) as { url?: string; error?: { message?: string } };
  if (!response.ok || !json.url) throw new Error(json.error?.message ?? "Stripe checkout failed");
  return json.url;
}

/** The plan and purchase time of a paid session, or null if it's unpaid or unknown. */
export async function readPaidSession(
  sessionId: string,
): Promise<{ id: string; plan: PlanId; paidAt: number; email?: string } | null> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
  const response = await fetch(`${API}/checkout/sessions/${sessionId}`, {
    headers: auth(),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const s = (await response.json()) as {
    id: string;
    created: number;
    payment_status?: string;
    metadata?: { plan?: string };
    customer_details?: { email?: string | null };
  };
  const plan = s.metadata?.plan;
  if (s.payment_status !== "paid" || !isPlanId(plan)) return null;
  /* The pass clock starts at purchase time, and the account is created once
     per session, so re-opening the success link never extends access. */
  return { id: s.id, plan, paidAt: s.created * 1000, email: s.customer_details?.email ?? undefined };
}
