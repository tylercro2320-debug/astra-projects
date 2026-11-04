import type { Metadata } from "next";

import { capFor } from "@/billing/pass";
import { PLANS, PLAN_IDS, formatPrice } from "@/billing/plans";
import { MODELS } from "@/generation/catalog";
import { displayFont, uiFont } from "@/dreamcorp/fonts";
import { DreamMark } from "@/studio/topbar";

import "@/dreamcorp/landing.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const CHECKOUT_NOTICES: Record<string, string> = {
  error: "Checkout couldn't start. Nothing was charged. Try again in a minute.",
  unpaid: "That payment didn't go through, so no pass was started.",
  expired: "That pass has already run out. Pick a new one below.",
  invalid: "Pick a Day Pass or a Week Pass to continue.",
  unavailable: "Checkout isn't switched on for this site yet.",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is this a subscription?",
    a: "No. A pass is a one-time payment. When it ends, it ends. Nothing renews and there's nothing to cancel.",
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
    q: "Do I need my own API key?",
    a: "No. DreamCorp runs the models on its own account. You write the prompt and we handle the rest.",
  },
  {
    q: "Where do my images live?",
    a: "Your history stays in this browser. Download anything you want to keep; result links from the model providers can expire.",
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

      <header className="dc-header">
        <a className="dc-brand" href="/">
          <DreamMark size={22} />
          <span>DreamCorp Studios</span>
        </a>
        <nav className="dc-nav" aria-label="Main">
          <a href="#models">Models</a>
          <a href="#passes">Passes</a>
          <a href="#faq">FAQ</a>
          <a className="dc-nav-cta" href="/studio">
            Open studio
          </a>
        </nav>
      </header>

      <main id="main">
        {notice && (
          <p className="dc-notice" role="status">
            {notice}
          </p>
        )}

        <section className="dc-hero" aria-labelledby="dc-hero-title">
          <div className="dc-hero-copy">
            <h1 id="dc-hero-title" className="dc-hero-title">
              Studio-grade AI images for a dollar a day.
            </h1>
            <p className="dc-hero-lede">
              {imageModels.length} leading image models behind one prompt bar. Buy a pass,
              make what you came to make, and walk away. Nothing renews.
            </p>
            <div className="dc-hero-actions">
              <form method="post" action="/api/checkout">
                <input type="hidden" name="plan" value="day" />
                <button className="dc-btn dc-btn--primary" type="submit">
                  Buy a Day Pass for {formatPrice(PLANS.day.cents)}
                </button>
              </form>
              <a className="dc-btn dc-btn--ghost" href="#passes">
                Compare passes
              </a>
            </div>
          </div>

          {/* The one loud thing on the page: the passes themselves, drawn as
              admission tickets, because that's literally what's being sold. */}
          <div className="dc-tickets" aria-hidden>
            <Ticket plan="week" cap={capFor("week")} className="dc-ticket--back" />
            <Ticket plan="day" cap={capFor("day")} className="dc-ticket--front" />
          </div>
        </section>

        <section id="models" className="dc-section" aria-labelledby="dc-models-title">
          <h2 id="dc-models-title" className="dc-h2">
            Every pass opens every model
          </h2>
          <p className="dc-section-lede">
            Switch models mid-session without paying again. Each one brings its own aspect
            ratios, resolutions and reference-image slots.
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
          <h2 id="dc-passes-title" className="dc-h2">
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
                >
                  <input type="hidden" name="plan" value={id} />
                  <h3 className="dc-plan-name">{plan.name}</h3>
                  <p className="dc-plan-price">
                    <span className="dc-plan-amount">{formatPrice(plan.cents)}</span>
                    <span className="dc-plan-per">{plan.per}</span>
                  </p>
                  <ul className="dc-plan-list">
                    <li>All {imageModels.length} image models</li>
                    <li>Up to {capFor(id).toLocaleString("en-US")} images</li>
                    <li>Up to 4 images per prompt</li>
                    <li>Reference images, favorites, bulk download</li>
                    {id === "week" && <li>Works out to {perDay}¢ a day</li>}
                  </ul>
                  <button
                    className={`dc-btn ${id === "week" ? "dc-btn--primary" : "dc-btn--ghost"}`}
                    type="submit"
                  >
                    Buy {plan.name}
                  </button>
                </form>
              );
            })}
          </div>
          <p className="dc-fineprint">
            One-time payment through Stripe. Prices in USD. The pass is tied to this browser.
          </p>
        </section>

        <section className="dc-section" aria-labelledby="dc-how-title">
          <h2 id="dc-how-title" className="dc-h2">
            From payment to picture in under a minute
          </h2>
          <ol className="dc-steps">
            <li>
              <strong>Pick a pass.</strong> Pay {formatPrice(PLANS.day.cents)} for a day or{" "}
              {formatPrice(week.cents)} for a week. No account to create.
            </li>
            <li>
              <strong>Write a prompt.</strong> Choose a model, set the shape and size, add
              reference images if you have them.
            </li>
            <li>
              <strong>Keep the good ones.</strong> Favorite, download, or reuse any result to
              render it again with a tweak.
            </li>
          </ol>
        </section>

        <section id="faq" className="dc-section" aria-labelledby="dc-faq-title">
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

      <footer className="dc-footer">
        <span>© {new Date().getFullYear()} DreamCorp Studios</span>
        <span>
          Built on the open-source{" "}
          <a href="https://openhiggsfield.ai" rel="noopener">
            OpenHiggsfield AI
          </a>{" "}
          studio.
        </span>
      </footer>
    </div>
  );
}

function Ticket({
  plan,
  cap,
  className,
}: {
  plan: "day" | "week";
  cap: number;
  className: string;
}) {
  const p = PLANS[plan];
  return (
    <div className={`dc-ticket ${className}`} data-plan={plan}>
      <div className="dc-ticket-main">
        <span className="dc-ticket-brand">
          <DreamMark size={16} /> DreamCorp Studios
        </span>
        <span className="dc-ticket-name">{p.name}</span>
        <span className="dc-ticket-price">{formatPrice(p.cents)}</span>
      </div>
      <div className="dc-ticket-stub">
        <span>Valid {p.hours === 24 ? "24 hours" : "7 days"}</span>
        <span>{cap} images</span>
      </div>
    </div>
  );
}
