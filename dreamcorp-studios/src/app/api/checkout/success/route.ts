import { NextResponse } from "next/server";

import { PASS_COOKIE, encodePass, mintPass, passCookieOptions } from "@/billing/pass";
import { readPaidSession } from "@/billing/stripe";

/* Stripe sends the buyer back here. The session is re-read from Stripe rather
   than trusted from the URL, so only a paid session can mint a pass. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") ?? "";
  const paid = await readPaidSession(sessionId).catch(() => null);
  if (!paid) return NextResponse.redirect(`${url.origin}/?checkout=unpaid#passes`, 303);

  const pass = mintPass(paid.plan, paid.id, paid.paidAt);
  if (pass.expiresAt <= Date.now()) {
    return NextResponse.redirect(`${url.origin}/?checkout=expired#passes`, 303);
  }
  const response = NextResponse.redirect(`${url.origin}/studio?pass=started`, 303);
  response.cookies.set(PASS_COOKIE, encodePass(pass), passCookieOptions(pass));
  return response;
}
