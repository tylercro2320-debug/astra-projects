import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { currentUser } from "@/server/accounts";
import { SitePage } from "@/dreamcorp/site-page";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  "signed-out": "You're signed out.",
  existing: "That payment already has a login. Use the details you were given, or check your email.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const { next = "", notice } = await searchParams;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "";
  const user = await currentUser();
  if (user) redirect(safeNext || (user.role === "admin" ? "/admin" : "/studio"));

  return (
    <SitePage footer={false}>
      <section className="dc-auth">
        <div className="dc-card">
          <h1>Log in</h1>
          <p>Use the username and password you got after buying your pass.</p>
          {notice && NOTICES[notice] && (
            <p className="dc-notice" role="status">
              {NOTICES[notice]}
            </p>
          )}
          <LoginForm next={safeNext} />
          <p className="dc-fineprint">
            No login yet? <a href="/#passes">Get a pass</a>. It takes under a minute.
          </p>
        </div>
      </section>
    </SitePage>
  );
}
