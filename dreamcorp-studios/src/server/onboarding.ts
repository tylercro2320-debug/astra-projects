import "server-only";

import { PLANS, type PlanId } from "@/billing/plans";
import { SITE_NAME } from "@/site";

import { createCustomer, sessionCookie, type User } from "./accounts";
import { randomToken } from "./crypto";
import { kv } from "./env";

/* What happens after a payment clears: create the account, sign the buyer in,
   email the login details when email is configured, and hold the details for
   a one-time reveal on /welcome. The plain password is never stored, only
   kept for 30 minutes so the buyer can copy it once. */

export async function issueAccount(options: {
  plan: PlanId;
  source: User["source"];
  email?: string;
  ref?: string;
  startsAt?: number;
}): Promise<{ token: string; cookie: Awaited<ReturnType<typeof sessionCookie>> }> {
  const { user, password } = await createCustomer(options);
  const emailed = options.email ? await sendLoginEmail(options.email, user, password) : false;
  const token = randomToken(18);
  const store = await kv();
  await store.put(
    `reveal:${token}`,
    JSON.stringify({ username: user.username, password, plan: user.plan, expiresAt: user.expiresAt, emailed }),
    { expirationTtl: 1800 },
  );
  return { token, cookie: await sessionCookie(user) };
}

export async function takeReveal(token: string): Promise<{
  username: string;
  password: string;
  plan: PlanId;
  expiresAt: number;
  emailed: boolean;
} | null> {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const store = await kv();
  const raw = await store.get(`reveal:${token}`, "text");
  if (!raw) return null;
  return JSON.parse(raw);
}

/** Sends login details through Resend when RESEND_API_KEY and DREAMCORP_EMAIL_FROM are set. */
export async function sendLoginEmail(to: string, user: User, password: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.DREAMCORP_EMAIL_FROM;
  if (!key || !from) return false;
  const plan = user.plan ? PLANS[user.plan].name : "Access";
  const until = user.expiresAt ? new Date(user.expiresAt).toUTCString() : "no end date";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject: `Your ${SITE_NAME} login`,
        text: [
          `Your ${plan} is active until ${until}.`,
          "",
          `Username: ${user.username}`,
          `Password: ${password}`,
          "",
          `Log in at ${site}/login`,
          "",
          "Keep these details private. Anyone with them can use your pass.",
        ].join("\n"),
      }),
    });
    return response.ok;
  } catch (caught) {
    console.error("[email] send failed", caught);
    return false;
  }
}
