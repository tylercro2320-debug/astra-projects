import { NextResponse } from "next/server";

import { readPaidSession } from "@/billing/stripe";
import { userForRef } from "@/server/accounts";
import { issueAccount } from "@/server/onboarding";

/* Stripe sends the buyer back here. The session is re-read from Stripe rather
   than trusted from the URL, so only a paid session creates an account, and
   each paid session creates exactly one. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  const paid = await readPaidSession(sessionId).catch(() => null);
  if (!paid) return NextResponse.redirect(`${url.origin}/?checkout=unpaid#passes`, 303);

  if (await userForRef(paid.id)) {
    return NextResponse.redirect(`${url.origin}/login?notice=existing`, 303);
  }

  const { token, cookie } = await issueAccount({
    plan: paid.plan,
    source: "stripe",
    email: paid.email,
    ref: paid.id,
    startsAt: paid.paidAt,
  });
  const response = NextResponse.redirect(`${url.origin}/welcome?t=${token}`, 303);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
