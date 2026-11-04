import { NextResponse } from "next/server";

import { PASS_COOKIE, demoPassId, encodePass, mintPass, passCookieOptions } from "@/billing/pass";
import { isPlanId } from "@/billing/plans";
import { createCheckoutSession, demoCheckoutEnabled, stripeEnabled } from "@/billing/stripe";

/* The pricing cards post a plain form here, so buying works before any
   JavaScript loads. 303 turns the POST into a GET on the next page. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
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
    const pass = mintPass(plan, demoPassId());
    const response = NextResponse.redirect(`${origin}/studio?pass=started`, 303);
    response.cookies.set(PASS_COOKIE, encodePass(pass), passCookieOptions(pass));
    return response;
  }

  return NextResponse.redirect(`${origin}/?checkout=unavailable#passes`, 303);
}
