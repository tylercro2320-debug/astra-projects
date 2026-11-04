import type { Metadata } from "next";

import { PLANS } from "@/billing/plans";
import { currentUser } from "@/server/accounts";
import { takeReveal } from "@/server/onboarding";
import { SitePage } from "@/dreamcorp/site-page";

import { CopyButton } from "./copy-button";

export const metadata: Metadata = { title: "Your login", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t = "" } = await searchParams;
  // The link alone isn't enough: the details only show in the browser that paid.
  const [found, user] = await Promise.all([takeReveal(t), currentUser()]);
  const reveal = found && user?.username === found.username ? found : null;

  return (
    <SitePage footer={false}>
      <section className="dc-auth">
        <div className="dc-card">
          {reveal ? (
            <>
              <h1>Your pass is live</h1>
              <p>
                {PLANS[reveal.plan].name}, active until{" "}
                {new Date(reveal.expiresAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}.
                Save these details now. You'll need them to log in on another device.
              </p>
              <dl className="dc-creds">
                <div className="dc-cred">
                  <div>
                    <dt>Username</dt>
                    <dd>{reveal.username}</dd>
                  </div>
                  <CopyButton text={reveal.username} />
                </div>
                <div className="dc-cred">
                  <div>
                    <dt>Password</dt>
                    <dd>{reveal.password}</dd>
                  </div>
                  <CopyButton text={reveal.password} />
                </div>
              </dl>
              <p className="dc-fineprint">
                {reveal.emailed
                  ? "We've also emailed these to you."
                  : "This page expires in 30 minutes, so copy them somewhere safe."}
              </p>
              <div className="dc-form">
                <a className="dc-btn dc-btn--primary" href="/studio">
                  Open the studio
                </a>
              </div>
            </>
          ) : (
            <>
              <h1>This link has expired</h1>
              <p>Login details are shown for 30 minutes after payment. If you saved them, log in below.</p>
              <div className="dc-form">
                <a className="dc-btn dc-btn--primary" href="/login">
                  Log in
                </a>
              </div>
            </>
          )}
        </div>
      </section>
    </SitePage>
  );
}
