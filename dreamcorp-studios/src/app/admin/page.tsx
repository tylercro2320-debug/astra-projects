import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PLANS } from "@/billing/plans";
import { accessFor, currentUser, listUsers } from "@/server/accounts";
import { logout } from "@/server/session-actions";
import { SitePage } from "@/dreamcorp/site-page";

import { CreateUserForm, UserActions } from "./admin-forms";
import "./admin.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

function when(ms: number | null) {
  if (ms === null) return "Never";
  return new Date(ms).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminPage() {
  const me = await currentUser();
  if (!me) redirect("/login?next=/admin");
  if (me.role !== "admin") redirect("/studio");

  const users = await listUsers();
  const rows = await Promise.all(users.map(async (user) => ({ user, access: await accessFor(user) })));
  const live = rows.filter((r) => r.access.active && r.user.role === "customer").length;
  const revenueCents = rows
    .filter((r) => r.user.source === "stripe" && r.user.plan)
    .reduce((sum, r) => sum + PLANS[r.user.plan!].cents, 0);

  return (
    <SitePage footer={false}>
      <section className="dc-page dc-admin">
        <div className="dc-admin-head">
          <div>
            <h1 className="dc-h2">Admin</h1>
            <p className="dc-section-lede">Signed in as {me.username}.</p>
          </div>
          <form action={logout}>
            <button className="dc-btn dc-btn--ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <dl className="dc-admin-stats">
          <div>
            <dt>Active passes</dt>
            <dd>{live}</dd>
          </div>
          <div>
            <dt>Accounts</dt>
            <dd>{rows.length}</dd>
          </div>
          <div>
            <dt>Paid through Stripe</dt>
            <dd>${(revenueCents / 100).toFixed(2)}</dd>
          </div>
        </dl>

        <h2 className="dc-admin-h">Create an account</h2>
        <p className="dc-section-lede">
          Use this for payments taken outside the site, like EFT, or to give someone access.
        </p>
        <CreateUserForm />

        <h2 className="dc-admin-h">Accounts</h2>
        <div className="dc-admin-table-wrap">
          <table className="dc-admin-table">
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Images</th>
                <th scope="col">Access ends</th>
                <th scope="col">Source</th>
                <th scope="col">Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ user, access }) => (
                <tr key={user.username}>
                  <td>
                    <strong>{user.username}</strong>
                    {user.email && <div className="dc-admin-sub">{user.email}</div>}
                    {user.note && <div className="dc-admin-sub">{user.note}</div>}
                  </td>
                  <td>{user.role === "customer" ? PLANS[user.plan ?? "day"].name : user.role === "developer" ? "Developer" : "Admin"}</td>
                  <td>
                    <span className="dc-pill" data-state={access.active ? "on" : "off"}>
                      {access.active ? "Active" : access.reason === "limit" ? "Limit reached" : access.reason === "disabled" ? "Switched off" : "Ended"}
                    </span>
                  </td>
                  <td className="dc-num">
                    {access.used}
                    {user.cap !== null ? ` / ${user.cap}` : " · unlimited"}
                  </td>
                  <td>{when(user.expiresAt)}</td>
                  <td>{user.source}</td>
                  <td>
                    <UserActions username={user.username} disabled={user.disabled} role={user.role} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SitePage>
  );
}
