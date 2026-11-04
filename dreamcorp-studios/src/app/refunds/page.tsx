import type { Metadata } from "next";

import { PLANS, formatPrice } from "@/billing/plans";
import { CONTACT_EMAIL, SITE_NAME } from "@/site";
import { SitePage } from "@/dreamcorp/site-page";

export const metadata: Metadata = {
  title: "Refund policy",
  description: `When and how ${SITE_NAME} refunds Day and Week Passes.`,
};

const UPDATED = "4 November 2026";

export default function RefundsPage() {
  return (
    <SitePage>
      <article className="dc-page dc-legal">
        <h1>Refund policy</h1>
        <p className="dc-updated">Last updated {UPDATED}.</p>

        <p>
          A Day Pass costs {formatPrice(PLANS.day.cents)} and a Week Pass costs {formatPrice(PLANS.week.cents)}. Both
          are one-time payments for time-limited access. Nothing renews, so there is never a charge to cancel.
        </p>

        <h2>You get a full refund if</h2>
        <ul>
          <li>you were charged but never received a working login;</li>
          <li>you were charged twice for the same pass;</li>
          <li>
            the studio was down or failing for most of your pass, and you contact us within 7 days of buying it;
          </li>
          <li>
            you ask within 7 days of buying and generated fewer than 5 images on that pass.
          </li>
        </ul>

        <h2>We don&rsquo;t refund</h2>
        <ul>
          <li>time you didn&rsquo;t use on a pass that worked;</li>
          <li>passes that reached their image limit;</li>
          <li>results you didn&rsquo;t like. AI output varies, so try a different prompt or model;</li>
          <li>accounts we switched off for breaking the terms of use.</li>
        </ul>

        <h2>How to ask</h2>
        <ol>
          <li>
            Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you paid with.
          </li>
          <li>Include your username and roughly when you bought the pass.</li>
          <li>Tell us what went wrong.</li>
        </ol>
        <p>
          We answer within 3 working days. Approved refunds go back to the original payment method, and your bank
          usually shows them within 5 to 10 working days. The pass is switched off once the refund is made.
        </p>

        <h2>Your legal rights</h2>
        <p>
          This policy adds to your rights under South African consumer law, including the Consumer Protection Act and
          the Electronic Communications and Transactions Act. It doesn&rsquo;t take any of them away.
        </p>
      </article>
    </SitePage>
  );
}
