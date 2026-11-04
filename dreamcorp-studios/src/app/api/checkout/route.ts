import { NextResponse } from "next/server";

import { isPlanId } from "@/billing/plans";
import { createCheckoutSession, demoCheckoutEnabled, stripeEnabled } from "@/billing/stripe";
import { issueAccount } from "@/server/onboarding";

/* The pricing cards post a plain form here, so buying works before any
   JavaScript loads. 303 turns the POST into a GET on the next page. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  // Plain form posts aren't covered by Next's server-action CSRF check, so check origin here.
  const from = request.headers.get("origin");
  if (from && from !== origin) return new NextResponse("Forbidden", { status: 403 });

  const form = await request.formData();
  const plan = form.get("plan");
  if (!isPlanId(plan)) return NextResponse.redirect(`${origin}/?checkout=invalid#passes`, 303);

  if (stripeEnabled()) {
    try {
      return NextResponse.redirect(await createCheckoutSession(plan, origin), 303);
    } catch (caught) {
      console.error("[checkout] stripe", caught);
      return NextResponse.redirect(`${origin}/?checkout=error#passes`, 303);
    }
  }

  if (demoCheckoutEnabled()) {
    const { token, cookie } = await issueAccount({ plan, source: "demo" });
    const response = NextResponse.redirect(`${origin}/welcome?t=${token}`, 303);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  }

  return NextResponse.redirect(`${origin}/?checkout=unavailable#passes`, 303);
}
