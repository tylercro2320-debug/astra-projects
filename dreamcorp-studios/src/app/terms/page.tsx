import type { Metadata } from "next";

import { CONTACT_EMAIL, LEGAL_ENTITY, SITE_NAME } from "@/site";
import { SitePage } from "@/dreamcorp/site-page";

export const metadata: Metadata = { title: "Terms of use" };

const UPDATED = "4 November 2026";

export default function TermsPage() {
  return (
    <SitePage>
      <article className="dc-page dc-legal">
        <h1>Terms of use</h1>
        <p className="dc-updated">Last updated {UPDATED}.</p>

        <h2>The service</h2>
        <p>
          {SITE_NAME} is run by {LEGAL_ENTITY}. A pass gives one person access to the studio for the time and image
          limit shown at checkout. Logins are personal. Sharing a customer login, reselling access, or automating
          the studio can get the account switched off without a refund.
        </p>

        <h2>What you can make</h2>
        <p>Don&rsquo;t use the studio to create:</p>
        <ul>
          <li>sexual content involving minors, or any content that sexualises real people without consent;</li>
          <li>images meant to deceive, such as fake documents or fake evidence;</li>
          <li>content that harasses, threatens or impersonates a real person;</li>
          <li>anything illegal in South Africa or where you live.</li>
        </ul>

        <h2>Your images</h2>
        <p>
          You may use the images you generate for personal and commercial work, subject to these terms and the
          rules of the underlying AI models. You are responsible for how you use them. We don&rsquo;t claim ownership
          of your prompts or results.
        </p>

        <h2>Availability</h2>
        <p>
          We work to keep the studio running, but AI models can be slow, unavailable or refuse a prompt. If an outage
          on our side stops you using your pass, the <a href="/refunds">refund policy</a> applies.
        </p>

        <h2>Liability</h2>
        <p>
          To the extent the law allows, our total liability to you is limited to what you paid for the pass in
          question.
        </p>

        <h2>Contact</h2>
        <p>
          Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. These terms are governed by the laws of
          South Africa.
        </p>
      </article>
    </SitePage>
  );
}
