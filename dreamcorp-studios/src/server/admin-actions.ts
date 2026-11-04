"use server";

import { revalidatePath } from "next/cache";

import { PLANS, isPlanId } from "@/billing/plans";

import {
  createCustomer,
  currentUser,
  deleteUser,
  getUser,
  normalizeUsername,
  resetUsage,
  saveUser,
  type User,
} from "./accounts";
import { hashPassword, readablePassword } from "./crypto";
import { sendLoginEmail } from "./onboarding";

/* Every admin action re-checks the caller's role on the server. Server actions
   also carry Next's built-in origin check, so another site can't post them. */

export type AdminResult = { ok: boolean; message: string; secret?: { username: string; password: string } };

async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user || user.role !== "admin") throw new Error("Admins only");
  return user;
}

export async function adminCreateUser(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  await requireAdmin();
  const kind = String(form.get("kind"));
  const requested = String(form.get("username") ?? "").trim();
  const username = requested ? (normalizeUsername(requested) ?? undefined) : undefined;
  if (requested && !username) {
    return { ok: false, message: "Usernames are 3 to 32 characters: letters, numbers, dots, dashes." };
  }
  if (username && (await getUser(username))) return { ok: false, message: `${username} already exists.` };
  const email = String(form.get("email") ?? "").trim() || undefined;
  const note = String(form.get("note") ?? "").trim().slice(0, 200) || undefined;

  if (isPlanId(kind)) {
    const { user, password } = await createCustomer({ plan: kind, source: "admin", username, email, note });
    const emailed = email ? await sendLoginEmail(email, user, password) : false;
    revalidatePath("/admin");
    return {
      ok: true,
      message: `${PLANS[kind].name} created for ${user.username}.${emailed ? ` Login details emailed to ${email}.` : email ? " The email didn't send, so pass the details on yourself." : ""}`,
      secret: { username: user.username, password },
    };
  }

  if (kind === "developer" || kind === "admin") {
    const password = readablePassword(16);
    const name = username ?? `dev-${readablePassword(5).toLowerCase()}`;
    await saveUser({
      username: name,
      hash: await hashPassword(password),
      role: kind,
      plan: null,
      expiresAt: null,
      cap: null,
      createdAt: Date.now(),
      disabled: false,
      sv: 1,
      email,
      note,
      source: "admin",
    });
    revalidatePath("/admin");
    return { ok: true, message: `Unlimited ${kind} account created.`, secret: { username: name, password } };
  }
  return { ok: false, message: "Pick what kind of account to create." };
}

export async function adminUpdateUser(_prev: AdminResult | null, form: FormData): Promise<AdminResult> {
  const admin = await requireAdmin();
  const username = normalizeUsername(form.get("username"));
  const action = String(form.get("action"));
  const user = username ? await getUser(username) : null;
  if (!user) return { ok: false, message: "That account no longer exists." };
  if (user.username === admin.username && (action === "disable" || action === "delete")) {
    return { ok: false, message: "You can't switch off or delete your own admin account." };
  }

  switch (action) {
    case "extend-day":
    case "extend-week": {
      const plan = action === "extend-day" ? "day" : "week";
      const from = Math.max(Date.now(), user.expiresAt ?? Date.now());
      await saveUser({ ...user, plan, expiresAt: from + PLANS[plan].hours * 3600_000 });
      revalidatePath("/admin");
      return { ok: true, message: `${user.username} extended by ${PLANS[plan].name}.` };
    }
    case "reset-usage":
      await resetUsage(user.username);
      revalidatePath("/admin");
      return { ok: true, message: `${user.username}'s image count is back to 0.` };
    case "password": {
      const password = readablePassword(user.role === "customer" ? 14 : 16);
      await saveUser({ ...user, hash: await hashPassword(password), sv: user.sv + 1 });
      revalidatePath("/admin");
      return {
        ok: true,
        message: `New password set. ${user.username} was signed out everywhere.`,
        secret: { username: user.username, password },
      };
    }
    case "disable":
      await saveUser({ ...user, disabled: true, sv: user.sv + 1 });
      revalidatePath("/admin");
      return { ok: true, message: `${user.username} is switched off and signed out.` };
    case "enable":
      await saveUser({ ...user, disabled: false });
      revalidatePath("/admin");
      return { ok: true, message: `${user.username} is switched back on.` };
    case "delete":
      await deleteUser(user.username);
      revalidatePath("/admin");
      return {
        ok: true,
        message:
          user.source === "seed"
            ? `${user.username}'s changes were removed. Seed accounts come back from the DREAMCORP_SEED_USERS secret; switch it off instead to block it.`
            : `${user.username} was deleted.`,
      };
    default:
      return { ok: false, message: "Unknown action." };
  }
}
