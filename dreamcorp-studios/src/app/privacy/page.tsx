import type { Metadata } from "next";

import { CONTACT_EMAIL, INFORMATION_OFFICER, LEGAL_ENTITY, SITE_NAME } from "@/site";
import { SitePage } from "@/dreamcorp/site-page";

export const metadata: Metadata = {
  title: "Privacy policy (POPIA)",
  description: `How ${SITE_NAME} collects, uses and protects personal information under South Africa's POPIA.`,
};

const UPDATED = "4 November 2026";

export default function PrivacyPage() {
  return (
    <SitePage>
      <article className="dc-page dc-legal">
        <h1>Privacy policy</h1>
        <p className="dc-updated">
          Last updated {UPDATED}. This policy follows the Protection of Personal Information Act 4 of 2013 (POPIA).
        </p>

        <h2>Who we are</h2>
        <p>
          {LEGAL_ENTITY} (&ldquo;we&rdquo;) runs {SITE_NAME}, an AI image studio sold as Day and Week Passes. We are the
          responsible party for the personal information described here. Our Information Officer is{" "}
          {INFORMATION_OFFICER}, reachable at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account details:</strong> your username, a one-way hash of your password (we never store the
            password itself), your pass type, and when it starts and ends.
          </li>
          <li>
            <strong>Email address:</strong> if you give one at checkout, so we can send your login details.
          </li>
          <li>
            <strong>Payment records:</strong> payments are processed by our payment provider. We receive confirmation
            that you paid and the amount. We never see or store your card number.
          </li>
          <li>
            <strong>Prompts and images:</strong> the text you type and the images generated from it.
          </li>
          <li>
            <strong>Usage counts:</strong> how many images you have generated on your pass, to apply the fair-use limit.
          </li>
          <li>
            <strong>Security data:</strong> your IP address, held for up to 15 minutes after failed login attempts so we
            can block password guessing.
          </li>
        </ul>

        <h2>Why we use it</h2>
        <p>
          We process this information to create and run your account, deliver what you paid for, keep the service
          secure, and meet legal and tax obligations. The lawful basis is performing our contract with you and our
          legitimate interest in preventing abuse. We do not sell personal information, and we do not use it for
          advertising profiles.
        </p>

        <h2>Cookies</h2>
        <p>
          We use only the cookies the studio needs to work: a sign-in cookie that keeps you logged in, and a device
          cookie that keeps your uploads apart from other people&rsquo;s. There are no advertising or analytics cookies.
          Your gallery history is stored in your own browser, not on our servers.
        </p>

        <h2>Who we share it with</h2>
        <p>
          We use operators who process information on our behalf under contract: Cloudflare (hosting, storage and
          the AI models that turn prompts into images), our payment provider, and our email provider for login
          details. Some of them store data outside South Africa. We only use operators bound by data protection
          standards comparable to POPIA, as section 72 requires.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Generated images: up to 30 days, then deleted automatically.</li>
          <li>Account records: while your account exists. Ask us and we will delete it.</li>
          <li>Payment records: as long as tax law requires, usually five years.</li>
        </ul>

        <h2>How we protect it</h2>
        <p>
          Passwords are stored as salted PBKDF2 hashes. Sign-in cookies are signed and HTTP-only. All traffic uses
          HTTPS. Access to the admin tools is limited to authorised staff.
        </p>

        <h2>Your rights</h2>
        <p>Under POPIA you can:</p>
        <ul>
          <li>ask what personal information we hold about you, and get a copy;</li>
          <li>ask us to correct or delete it;</li>
          <li>object to how we process it;</li>
          <li>withdraw consent where we rely on it.</li>
        </ul>
        <p>
          Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your username and we will reply within
          30 days. If you are unhappy with our answer, you can complain to the Information Regulator of South Africa
          at <a href="https://inforegulator.org.za">inforegulator.org.za</a>.
        </p>

        <h2>Children</h2>
        <p>{SITE_NAME} is not meant for anyone under 18. We do not knowingly create accounts for children.</p>

        <h2>Changes</h2>
        <p>If we change this policy, we will update the date at the top and say what changed.</p>
      </article>
    </SitePage>
  );
}
