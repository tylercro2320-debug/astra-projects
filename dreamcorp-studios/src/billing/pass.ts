import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { PLANS, isPlanId, type PlanId } from "./plans";

/* A pass is a signed, expiring claim held in an httpOnly cookie:
   base64url(JSON payload) + "." + base64url(HMAC-SHA256). Only the server can
   mint one, so checking a pass needs no database. */

export const PASS_COOKIE = "dc_pass";

export interface Pass {
  /** Stripe Checkout session id (or a random id in demo mode). Also the usage key. */
  id: string;
  plan: PlanId;
  /** Epoch ms. */
  issuedAt: number;
  expiresAt: number;
}

function secret(): string {
  const value = process.env.DREAMCORP_PASS_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return "dev-only-pass-secret-change-me-0123456789";
  throw new Error("DREAMCORP_PASS_SECRET must be set (32+ chars) in production");
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function mintPass(plan: PlanId, id: string, issuedAt = Date.now()): Pass {
  return { id, plan, issuedAt, expiresAt: issuedAt + PLANS[plan].hours * 3600_000 };
}

export function demoPassId(): string {
  return `demo_${randomBytes(12).toString("hex")}`;
}

export function encodePass(pass: Pass): string {
  const body = Buffer.from(JSON.stringify(pass)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodePass(raw: string | undefined, now = Date.now()): Pass | null {
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(body));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const pass = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<Pass>;
    if (typeof pass.id !== "string" || !isPlanId(pass.plan)) return null;
    if (typeof pass.expiresAt !== "number" || typeof pass.issuedAt !== "number") return null;
    if (pass.expiresAt <= now) return null;
    return pass as Pass;
  } catch {
    return null;
  }
}

export function passCookieOptions(pass: Pass) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(0, Math.floor((pass.expiresAt - Date.now()) / 1000)),
  };
}

export function capFor(plan: PlanId): number {
  const raw = Number(process.env[`DREAMCORP_CAP_${plan.toUpperCase()}`]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : PLANS[plan].defaultCap;
}
