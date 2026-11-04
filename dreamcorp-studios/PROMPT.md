# The DreamCorp Studios transformation prompt

Paste the prompt below into Claude Code (or any coding agent), with the
open-source OpenHiggsfield AI repo checked out as the working directory. It is
the brief this repo was built from. Rerun it on a fresh copy of the upstream
repo to rebuild DreamCorp Studios, or change the names and prices to make your
own branded version.

---

```text
You are a senior full-stack engineer and product designer. This repository is
OpenHiggsfield AI, an open-source Next.js 16 / React 19 studio for AI image and
video generation, where every visitor brings their own platform API key.

Turn it into DreamCorp Studios: a cheap, pay-as-you-go AI image studio that
offers the same model quality for far less than a monthly subscription.

BUSINESS MODEL
- Visitors no longer bring an API key. DreamCorp holds one platform key on the
  server (env DREAMCORP_PLATFORM_KEY) and visitors buy time:
  - Day Pass: $1.00, valid 24 hours from payment.
  - Week Pass: $2.99, valid 7 days from payment.
- One-time payments only (Stripe Checkout, mode=payment). Nothing renews.
- Each pass carries a fair-use image cap (default 150 for a day, 750 for a
  week, overridable by env) so one buyer can't run up unbounded cost.
- Default the catalog to image models only. Video costs far more per run than
  $1/day can cover, so hide video behind NEXT_PUBLIC_DREAMCORP_VIDEO=1.

BACKEND
1. src/billing/plans.ts: plan table in cents (client-safe).
2. src/billing/pass.ts: passes are HMAC-SHA256-signed, expiring claims in an
   httpOnly cookie (DREAMCORP_PASS_SECRET, 32+ chars, required in production;
   fail closed without it). No database needed to verify a pass.
3. src/billing/stripe.ts: create a Checkout session and re-read a session over
   plain fetch (no SDK). Only a session Stripe reports as "paid" may mint a
   pass. The pass clock starts at purchase time, so replaying the success URL
   can never extend it.
4. POST /api/checkout (plain HTML form post, works without JS) redirects to
   Stripe. GET /api/checkout/success sets the pass cookie and redirects to
   /studio. Support DREAMCORP_DEMO_CHECKOUT=1 to grant free passes locally
   when Stripe isn't configured. It must never run when Stripe is.
5. src/billing/usage.ts: per-pass image counter. Use in-memory by default and
   Upstash/Vercel KV over REST when KV_REST_API_URL/TOKEN are set.
6. Rewrite src/generation/actions.ts: require an active pass, charge the cap
   before submitting (refund if the submit throws), and use the house key.
   Keep polling working after expiry so paid runs still land.
7. Gate /api/blob uploads on an active pass.

FRONTEND
- Move the studio to /studio. Build a new marketing landing page at /.
- Replace the API-key modal with a pass modal (two plans, each a form post to
  /api/checkout). Replace the topbar key button with pass status
  ("142 left · 21h"). Add a home link with the DreamCorp mark.
- Rebrand everything user-facing: name, metadata, OG alt, manifest
  (start_url /studio), favicon, storage keys, download filenames. Credit the
  upstream project in the footer.

DESIGN DIRECTION (don't make it look like the original's near-black + lime)
- Palette: night indigo #15113a ground, dusk #211a52 / #2c2468 surfaces,
  moon #f6f3ff text, haze #c7c0ec secondary text, marigold #ffc857 as the
  single "thing you buy / primary action" accent, lilac #b9a8ff secondary.
- Type: Bricolage Grotesque (display, prices, headlines) + Instrument Sans
  (UI and body) via next/font.
- Hero: left-aligned headline "Studio-grade AI images for a dollar a day."
  The one loud element is the passes themselves, drawn as two overlapping
  admission tickets with perforated stubs and notches, dealt in on load.
- Sections: models (chips from the live catalog), two pricing cards (Week is
  the filled, recommended one and shows its per-day cost), a 3-step "how it
  works", and an FAQ in <details>. Copy is plain, sentence case, no hype.
- Retheme the studio by changing its token block only, so every component
  inherits it. Keep placeholder art inside the indigo-to-dusk-pink band.
- Quality floor: responsive to 390px with no horizontal scroll, visible focus,
  prefers-reduced-motion respected, AA contrast.

DELIVERABLES
- Passing `pnpm build` and type-check.
- .env.example documenting every variable.
- README covering setup, Stripe, costs and the security model.
- Screenshots of the landing page (desktop and mobile), the pass modal, and
  the studio with an active pass.
```
