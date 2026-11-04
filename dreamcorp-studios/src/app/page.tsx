import type { Metadata } from "next";

import { PLANS, PLAN_IDS, formatPrice } from "@/billing/plans";
import { MODELS } from "@/generation/catalog";
import { capFor } from "@/server/accounts";
import { DreamMonitor } from "@/dreamcorp/dream-monitor";
import { displayFont, uiFont } from "@/dreamcorp/fonts";
import { ScrollReveal } from "@/dreamcorp/scroll-reveal";
import { SiteFooter, SiteHeader } from "@/dreamcorp/site-chrome";

import "@/dreamcorp/landing.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const CHECKOUT_NOTICES: Record<string, string> = {
  error: "Checkout couldn't start. Nothing was charged. Try again in a minute.",
  unpaid: "That payment didn't go through, so no pass was started.",
  invalid: "Pick a Day Pass or a Week Pass to continue.",
  unavailable: "Checkout isn't switched on for this site yet.",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is this a subscription?",
    a: "No. A pass is a one-time payment. When it ends, it ends. Nothing renews and there's nothing to cancel.",
  },
  {
    q: "How do I log in after paying?",
    a: "Your username and password appear on screen the moment payment clears, and we email them to you too. Use them on the Log in page from any device.",
  },
  {
    q: "When does my pass start?",
    a: "The moment your payment clears. A Day Pass runs 24 hours from then, a Week Pass runs 7 days.",
  },
  {
    q: "Why is there an image limit?",
    a: "It's a fair-use ceiling so one person can't run up the bill for everyone else. Most people never reach it.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes, if something on our side stopped you from generating. The refund policy explains exactly when.",
  },
];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const notice = checkout ? CHECKOUT_NOTICES[checkout] : undefined;
  const imageModels = MODELS.filter((model) => model.surface === "image");
  const week = PLANS.week;
  const perDay = Math.round(week.cents / 7);

  return (
    <div className={`dc ${displayFont.variable} ${uiFont.variable}`}>
      <a className="dc-skip" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <ScrollReveal />

      <main id="main" className="dc-main">
        {notice && (
          <p className="dc-notice" role="status">
            {notice}
          </p>
        )}

        <section className="dc-hero" aria-labelledby="dc-hero-title">
          <div className="dc-hero-copy">
            <h1 id="dc-hero-title" className="dc-hero-title">
              <span className="dc-hero-line">Studio-grade</span>
              <span className="dc-hero-line">AI images for</span>
              <span className="dc-hero-line">a dollar a day.</span>
            </h1>
            <p className="dc-hero-lede">
              Type what you see in your head. Get a finished picture back in seconds. Buy a
              pass, make what you came to make, and walk away. Nothing renews.
            </p>
            <div className="dc-hero-actions">
              <form method="post" action="/api/checkout">
                <input type="hidden" name="plan" value="day" />
                <button className="dc-btn dc-btn--primary" type="submit">
                  Buy a Day Pass for {formatPrice(PLANS.day.cents)}
                </button>
              </form>
              <a className="dc-btn dc-btn--ghost" href="/login">
                I have a login
              </a>
            </div>
          </div>
          <DreamMonitor />
        </section>

        <section id="models" className="dc-section" aria-labelledby="dc-models-title" data-reveal>
          <h2 id="dc-models-title" className="dc-h2">
            Every pass opens every model
          </h2>
          <p className="dc-section-lede">
            Switch models mid-session without paying again. Flash is built for detail, Lightning
            for speed and wide frames.
          </p>
          <ul className="dc-models">
            {imageModels.map((model) => (
              <li key={model.id} className="dc-model">
                {model.label}
              </li>
            ))}
          </ul>
        </section>

        <section id="passes" className="dc-section" aria-labelledby="dc-passes-title">
          <h2 id="dc-passes-title" className="dc-h2" data-reveal>
            Two passes. Pick how long you need.
          </h2>
          <div className="dc-plans">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              return (
                <form
                  key={id}
                  method="post"
                  action="/api/checkout"
                  className="dc-plan"
                  data-plan={id}
                  data-deal
                >
                  <input type="hidden" name="plan" value={id} />
                  <div className="dc-plan-main">
                    <h3 className="dc-plan-name">{plan.name}</h3>
                    <p className="dc-plan-price">
                      <span className="dc-plan-amount">{formatPrice(plan.cents)}</span>
                      <span className="dc-plan-per">{plan.per}</span>
                    </p>
                    <ul className="dc-plan-list">
                      <li>Every model in the studio</li>
                      <li>Up to {capFor(id).toLocaleString("en-US")} images</li>
                      <li>Your own login, on any device</li>
                      {id === "week" ? <li>Works out to {perDay}¢ a day</li> : <li>Favorites and downloads</li>}
                    </ul>
                  </div>
                  <div className="dc-plan-stub">
                    <button className="dc-btn dc-btn--stub" type="submit">
                      Buy {plan.name}
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
          <p className="dc-fineprint" data-reveal>
            One-time payment. Prices in USD. See the <a href="/refunds">refund policy</a>.
          </p>
        </section>

        <section className="dc-section" aria-labelledby="dc-how-title" data-reveal>
          <h2 id="dc-how-title" className="dc-h2">
            From payment to picture in under a minute
          </h2>
          <ol className="dc-steps">
            <li>
              <strong>Pick a pass.</strong> Pay {formatPrice(PLANS.day.cents)} for a day or{" "}
              {formatPrice(week.cents)} for a week.
            </li>
            <li>
              <strong>Get your login.</strong> Your username and password appear on screen and
              land in your inbox.
            </li>
            <li>
              <strong>Write a prompt.</strong> Pick a model and a frame shape, then press
              Generate. Keep the good ones.
            </li>
          </ol>
        </section>

        <section id="faq" className="dc-section" aria-labelledby="dc-faq-title" data-reveal>
          <h2 id="dc-faq-title" className="dc-h2">
            Questions people ask before paying
          </h2>
          <div className="dc-faq">
            {FAQ.map((item) => (
              <details key={item.q} className="dc-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
