"use server";

import { redirect } from "next/navigation";

import type { PassStatus } from "@/billing/plans";

import { accessFor, attemptLogin, currentUser, endSession, startSession } from "./accounts";

export async function getAccessStatus(): Promise<PassStatus> {
  const user = await currentUser();
  if (!user) {
    return {
      signedIn: false,
      active: false,
      reason: "signed-out",
      username: null,
      role: null,
      unlimited: false,
      plan: null,
      expiresAt: null,
      used: 0,
      cap: null,
    };
  }
  const access = await accessFor(user);
  return {
    signedIn: true,
    active: access.active,
    reason: access.reason,
    username: user.username,
    role: user.role,
    unlimited: access.unlimited,
    plan: user.plan,
    expiresAt: access.expiresAt,
    used: access.used,
    cap: access.cap,
  };
}

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const result = await attemptLogin(form.get("username"), form.get("password"));
  if (!result.ok) return { error: result.error };
  await startSession(result.user);
  const next = String(form.get("next") ?? "");
  // Only same-site paths, never an absolute URL, so the form can't be used to bounce people elsewhere.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : result.user.role === "admin" ? "/admin" : "/studio");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login?notice=signed-out");
}
