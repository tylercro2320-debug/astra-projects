"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/server/session-actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form className="dc-form" action={action}>
      <input type="hidden" name="next" value={next} />
      <label className="dc-field" htmlFor="username">
        Username
        <input
          id="username"
          className="dc-input"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </label>
      <label className="dc-field" htmlFor="password">
        Password
        <input
          id="password"
          className="dc-input"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state.error && (
        <p className="dc-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="dc-btn dc-btn--primary" type="submit" disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
