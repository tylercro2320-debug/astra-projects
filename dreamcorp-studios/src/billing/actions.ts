"use server";

import { cookies } from "next/headers";

import { PASS_COOKIE, capFor, decodePass } from "./pass";
import type { PassStatus } from "./plans";
import { usage } from "./usage";

export async function getPassStatus(): Promise<PassStatus> {
  const pass = decodePass((await cookies()).get(PASS_COOKIE)?.value);
  if (!pass) return { active: false, plan: null, expiresAt: null, used: 0, cap: 0 };
  return {
    active: true,
    plan: pass.plan,
    expiresAt: pass.expiresAt,
    used: await usage.get(pass.id),
    cap: capFor(pass.plan),
  };
}
