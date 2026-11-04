# DreamCorp Studios

Studio-grade AI image generation for **$1 a day** or **$2.99 a week**. There's
no subscription and visitors don't need their own API key.

DreamCorp Studios is a fork of the open-source
[OpenHiggsfield AI](https://openhiggsfield.ai) studio. The upstream studio
asks every visitor for their own platform key. This version holds one house
key on the server and sells time-boxed passes through Stripe instead.

The prompt that produced this fork is in [`PROMPT.md`](./PROMPT.md).

## What changed from upstream

| Area | Upstream | DreamCorp Studios |
| --- | --- | --- |
| Access | Visitor pastes `id:secret` key | Visitor buys a Day or Week Pass |
| Billing | None | Stripe Checkout, one-time payments |
| Key | Per-visitor cookie | One server-side `DREAMCORP_PLATFORM_KEY` |
| Cost control | None | Per-pass fair-use image cap |
| Catalog | 8 image + 30 video | 8 image (video behind a flag) |
| Routes | Studio at `/` | Landing at `/`, studio at `/studio` |
| Uploads | Open to anyone | Gated on an active pass |
| Look | Near-black + lime, Inter | Night indigo + marigold, Bricolage Grotesque + Instrument Sans |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill it in
pnpm dev                     # http://localhost:3000
```

To click through without Stripe, set `DREAMCORP_DEMO_CHECKOUT=1`. Every
"Buy" button then grants a pass for free. Demo mode switches itself off
whenever `STRIPE_SECRET_KEY` is set.

### Environment

| Variable | Purpose |
| --- | --- |
| `HF_API_BASE_URL` | Generation platform origin (server only) |
| `DREAMCORP_PLATFORM_KEY` | DreamCorp's own platform key, `id:secret` |
| `DREAMCORP_PASS_SECRET` | 32+ chars; signs pass cookies. Required in production |
| `STRIPE_SECRET_KEY` | Turns on real checkout (`sk_test_…` while testing) |
| `DREAMCORP_DEMO_CHECKOUT` | `1` = free passes when Stripe isn't set |
| `DREAMCORP_CAP_DAY` / `DREAMCORP_CAP_WEEK` | Images per pass (default 150 / 750) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Usage counter store (Vercel KV / Upstash) |
| `DREAMCORP_BLOB_TOKEN` | Vercel Blob read-write token for uploads |
| `NEXT_PUBLIC_DREAMCORP_VIDEO` | `1` = also offer video models |

## How a pass works

1. A pricing card posts `plan=day|week` to `POST /api/checkout`.
2. The server creates a Stripe Checkout session and redirects to it.
3. Stripe returns the buyer to `GET /api/checkout/success?session_id=…`. The
   server re-reads that session from Stripe and mints a pass only when it's
   `paid`.
4. The pass is an HMAC-signed `{id, plan, issuedAt, expiresAt}` in an httpOnly
   cookie. Expiry is counted from the purchase time, so replaying the success
   link can't extend it.
5. `submitGeneration` checks the pass, charges the image cap, and calls the
   platform with the house key. If the submit fails, the charge is refunded.

## Before you go live

- **Check that you're allowed to resell.** The upstream repo ships without a
  license file, and the models run on a third-party generation platform.
  Confirm the upstream author's terms and the platform's reseller terms before
  you charge anyone.
- **Do the cost math.** $1 a day only works if your average cost per image ×
  the images people actually generate stays under about $0.70 (Stripe takes
  about $0.33 of a $1 charge). Tune `DREAMCORP_CAP_DAY` / `_WEEK` against your
  real per-image cost. Micro-payments are expensive on Stripe's standard rate,
  so check whether their micropayments pricing fits.
- **Set up KV.** The in-memory usage counter resets on every serverless cold
  start, so caps are only enforced reliably with `KV_REST_API_*` set.
- **One pass per browser.** Passes live in a cookie. Clearing cookies loses the
  pass, and there are no accounts to recover one. Add accounts or a "resend my
  pass" email if that matters to your buyers.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |

Next.js 16 App Router · React 19 · plain CSS · Zustand · pnpm
