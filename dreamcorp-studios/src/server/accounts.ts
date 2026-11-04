import "server-only";

import { cookies, headers } from "next/headers";

import { PLANS, type PlanId } from "@/billing/plans";

import { b64url, fromB64url, hashPassword, readablePassword, sign, verifyPassword, verifySignature } from "./crypto";
import { kv } from "./env";

/* Accounts, sessions and access.

   - A user lives in KV at user:<username>. Passwords are PBKDF2-SHA256 hashes.
   - Seed accounts (the admin and the developer accounts) come from the
     DREAMCORP_SEED_USERS secret, so they exist without anyone writing to KV.
     Once the admin edits one, the KV copy takes over.
   - A session is an HMAC-signed cookie {u, sv, exp}. Each request re-reads the
     user, so disabling an account or resetting its password (which bumps sv)
     logs it out everywhere at once. */

export type Role = "customer" | "developer" | "admin";

export interface User {
  username: string;
  hash: string;
  role: Role;
  plan: PlanId | null;
  /** Epoch ms when access ends; null = never. */
  expiresAt: number | null;
  /** Max images for the current access window; null = unlimited. */
  cap: number | null;
  createdAt: number;
  disabled: boolean;
  /** Session version: bumping it signs out every session. */
  sv: number;
  email?: string;
  note?: string;
  source: "stripe" | "demo" | "admin" | "seed";
  /** Stripe Checkout session that paid for this account, so it's created once. */
  ref?: string;
}

export interface Access {
  active: boolean;
  reason: "ok" | "expired" | "limit" | "disabled";
  unlimited: boolean;
  expiresAt: number | null;
  used: number;
  cap: number | null;
}

const SESSION_COOKIE = "dc_session";
const SESSION_DAYS = 7;
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().toLowerCase();
  return USERNAME_RE.test(name) ? name : null;
}

function secret(): string {
  const value = process.env.DREAMCORP_PASS_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production") return "dev-only-session-secret-change-me-0123456789";
  throw new Error("DREAMCORP_PASS_SECRET must be set (32+ chars) in production");
}

/* ---------- users ---------- */

function seeds(): User[] {
  const raw = process.env.DREAMCORP_SEED_USERS;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as User[];
    return Array.isArray(list) ? list.filter((u) => normalizeUsername(u.username)) : [];
  } catch {
    console.error("[accounts] DREAMCORP_SEED_USERS is not valid JSON");
    return [];
  }
}

export async function getUser(username: string): Promise<User | null> {
  const store = await kv();
  const raw = await store.get(`user:${username}`, "text");
  if (raw) return JSON.parse(raw) as User;
  return seeds().find((u) => u.username === username) ?? null;
}

export async function saveUser(user: User): Promise<void> {
  const store = await kv();
  await store.put(`user:${user.username}`, JSON.stringify(user));
}

export async function deleteUser(username: string): Promise<void> {
  const store = await kv();
  await store.delete(`user:${username}`);
  await store.delete(`usage:${username}`);
}

export async function listUsers(): Promise<User[]> {
  const store = await kv();
  const found = new Map<string, User>();
  for (const seed of seeds()) found.set(seed.username, seed);
  let cursor: string | undefined;
  do {
    const page = await store.list({ prefix: "user:", cursor, limit: 1000 });
    const rows = await Promise.all(page.keys.map((k) => store.get(k.name, "text")));
    for (const raw of rows) {
      if (!raw) continue;
      const user = JSON.parse(raw) as User;
      found.set(user.username, user);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return [...found.values()].sort((a, b) => b.createdAt - a.createdAt);
}

async function freeUsername(prefix = "dreamer"): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const digits = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => (b % 10).toString()).join("");
    const letters = readablePassword(3).toLowerCase().replace(/[^a-z]/g, "x");
    const name = `${prefix}-${letters}${digits}`;
    if (!(await getUser(name))) return name;
  }
  throw new Error("Could not pick a username");
}

/** Creates a customer account for a paid (or admin-issued) pass. Returns the
    plain password exactly once; only its hash is stored. */
export async function createCustomer(options: {
  plan: PlanId;
  source: User["source"];
  email?: string;
  ref?: string;
  startsAt?: number;
  username?: string;
  note?: string;
}): Promise<{ user: User; password: string }> {
  const username = options.username ?? (await freeUsername());
  const password = readablePassword();
  const startsAt = options.startsAt ?? Date.now();
  const user: User = {
    username,
    hash: await hashPassword(password),
    role: "customer",
    plan: options.plan,
    expiresAt: startsAt + PLANS[options.plan].hours * 3600_000,
    cap: capFor(options.plan),
    createdAt: Date.now(),
    disabled: false,
    sv: 1,
    email: options.email,
    note: options.note,
    source: options.source,
    ref: options.ref,
  };
  await saveUser(user);
  if (options.ref) {
    const store = await kv();
    await store.put(`ref:${options.ref}`, username);
  }
  return { user, password };
}

export async function userForRef(ref: string): Promise<User | null> {
  const store = await kv();
  const username = await store.get(`ref:${ref}`, "text");
  return username ? getUser(username) : null;
}

export function capFor(plan: PlanId): number {
  const raw = Number(process.env[`DREAMCORP_CAP_${plan.toUpperCase()}`]);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : PLANS[plan].defaultCap;
}

/* ---------- usage + access ---------- */

export async function usedBy(username: string): Promise<number> {
  const store = await kv();
  return Number(await store.get(`usage:${username}`, "text")) || 0;
}

export async function addUsage(user: User, amount: number): Promise<number> {
  const store = await kv();
  const next = Math.max(0, (await usedBy(user.username)) + amount);
  await store.put(`usage:${user.username}`, String(next));
  return next;
}

export async function resetUsage(username: string): Promise<void> {
  const store = await kv();
  await store.delete(`usage:${username}`);
}

export async function accessFor(user: User): Promise<Access> {
  const used = await usedBy(user.username);
  const unlimited = user.cap === null;
  const base = { unlimited, expiresAt: user.expiresAt, used, cap: user.cap };
  if (user.disabled) return { ...base, active: false, reason: "disabled" };
  if (user.expiresAt !== null && user.expiresAt <= Date.now()) return { ...base, active: false, reason: "expired" };
  if (user.cap !== null && used >= user.cap) return { ...base, active: false, reason: "limit" };
  return { ...base, active: true, reason: "ok" };
}

/* ---------- sessions ---------- */

/** The signed session cookie for a user, for callers that build their own response. */
export async function sessionCookie(user: User) {
  const exp = Math.min(Date.now() + SESSION_DAYS * 864e5, user.expiresAt ?? Number.POSITIVE_INFINITY);
  const body = b64url(new TextEncoder().encode(JSON.stringify({ u: user.username, sv: user.sv, exp })));
  return {
    name: SESSION_COOKIE,
    value: `${body}.${await sign(body, secret())}`,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: Math.max(60, Math.floor((exp - Date.now()) / 1000)),
    },
  };
}

export async function startSession(user: User): Promise<void> {
  const c = await sessionCookie(user);
  (await cookies()).set(c.name, c.value, c.options);
}

export async function endSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  if (!(await verifySignature(body, raw.slice(dot + 1), secret()))) return null;
  try {
    const claim = JSON.parse(new TextDecoder().decode(fromB64url(body))) as { u: string; sv: number; exp: number };
    if (claim.exp <= Date.now()) return null;
    const user = await getUser(claim.u);
    if (!user || user.disabled || user.sv !== claim.sv) return null;
    return user;
  } catch {
    return null;
  }
}

/* ---------- login ---------- */

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

const MAX_FAILS = 8;
const LOCK_SECONDS = 15 * 60;

/** Checks a username and password, with a per-IP lockout after repeated failures. */
export async function attemptLogin(
  rawUsername: unknown,
  password: unknown,
): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const store = await kv();
  const rl = `rl:${await clientKey()}`;
  const fails = Number(await store.get(rl, "text")) || 0;
  if (fails >= MAX_FAILS) return { ok: false, error: "Too many attempts. Wait 15 minutes, then try again." };

  const username = normalizeUsername(rawUsername);
  const user = username ? await getUser(username) : null;
  // Hash even when the user doesn't exist so timing doesn't reveal valid usernames.
  const valid =
    typeof password === "string" &&
    password.length <= 200 &&
    (await verifyPassword(password, user?.hash ?? "pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"));

  if (!user || !valid) {
    await store.put(rl, String(fails + 1), { expirationTtl: LOCK_SECONDS });
    return { ok: false, error: "That username and password don't match." };
  }
  if (user.disabled) return { ok: false, error: "This account is switched off. Contact support." };
  await store.delete(rl);
  return { ok: true, user };
}
