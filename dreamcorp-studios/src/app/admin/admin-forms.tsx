"use client";

import { useActionState } from "react";

import { adminCreateUser, adminUpdateUser, type AdminResult } from "@/server/admin-actions";

function Result({ state }: { state: AdminResult | null }) {
  if (!state) return null;
  return (
    <div className={state.ok ? "dc-notice" : "dc-error"} role="status">
      <p style={{ margin: 0 }}>{state.message}</p>
      {state.secret && (
        <p style={{ margin: "8px 0 0" }}>
          Username <code>{state.secret.username}</code> · Password <code>{state.secret.password}</code>
          <br />
          This password is shown once. Send it to the customer now.
        </p>
      )}
    </div>
  );
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState(adminCreateUser, null);
  return (
    <form className="dc-admin-create" action={action}>
      <label className="dc-field" htmlFor="new-kind">
        Account
        <select id="new-kind" name="kind" className="dc-input" defaultValue="day">
          <option value="day">Day Pass customer</option>
          <option value="week">Week Pass customer</option>
          <option value="developer">Developer (unlimited)</option>
          <option value="admin">Admin (unlimited)</option>
        </select>
      </label>
      <label className="dc-field" htmlFor="new-username">
        Username (optional)
        <input id="new-username" name="username" className="dc-input" autoCapitalize="none" spellCheck={false} />
      </label>
      <label className="dc-field" htmlFor="new-email">
        Email (optional)
        <input id="new-email" name="email" type="email" className="dc-input" />
      </label>
      <label className="dc-field" htmlFor="new-note">
        Note (optional)
        <input id="new-note" name="note" className="dc-input" placeholder="Paid by EFT, promo partner…" />
      </label>
      <button className="dc-btn dc-btn--primary" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create account"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function UserActions({ username, disabled, role }: { username: string; disabled: boolean; role: string }) {
  const [state, action, pending] = useActionState(adminUpdateUser, null);
  return (
    <form className="dc-admin-actions" action={action}>
      <input type="hidden" name="username" value={username} />
      <select name="action" className="dc-input" aria-label={`Action for ${username}`} defaultValue="">
        <option value="" disabled>
          Choose…
        </option>
        {role === "customer" && <option value="extend-day">Add a day</option>}
        {role === "customer" && <option value="extend-week">Add a week</option>}
        {role === "customer" && <option value="reset-usage">Reset image count</option>}
        <option value="password">New password</option>
        {disabled ? <option value="enable">Switch on</option> : <option value="disable">Switch off</option>}
        <option value="delete">Delete</option>
      </select>
      <button className="dc-btn dc-btn--ghost" type="submit" disabled={pending}>
        {pending ? "…" : "Apply"}
      </button>
      <Result state={state} />
    </form>
  );
}
