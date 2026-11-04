"use server";

import { cookies } from "next/headers";

import { PASS_COOKIE, capFor, decodePass, type Pass } from "@/billing/pass";
import { usage } from "@/billing/usage";
import { countSetting } from "@/studio/data";

import { getModel, parseSettings } from "./catalog";
import type { GenerationPlane } from "./catalog/types";
import { MissingPassError, PassLimitError } from "./credentials";
import { createPlatformClient } from "./platform";
import type { StatusResult } from "./platform";
import { toPlatform } from "./to-platform";

/* DreamCorp Studios holds one platform key on the server (DREAMCORP_PLATFORM_KEY).
   Visitors never see or bring a key: an active pass is what lets a request
   through, and the fair-use cap is charged before the request leaves. */

export async function submitGeneration(plane: GenerationPlane) {
  const pass = await requirePass();
  const model = getModel(plane.model);
  const parsed: GenerationPlane = {
    ...plane,
    settings: parseSettings(model, plane.settings),
  };

  const native = countSetting(model);
  const images = native ? Math.max(1, Number(parsed.settings[native.key]) || 1) : 1;
  const cap = capFor(pass.plan);
  const ttl = Math.ceil((pass.expiresAt - Date.now()) / 1000);
  if ((await usage.get(pass.id)) + images > cap) throw new PassLimitError(cap);
  await usage.add(pass.id, images, ttl);

  try {
    const { path, body } = toPlatform(parsed);
    return await createPlatformClient(houseCredentials()).submit(path, body);
  } catch (caught) {
    // A request that never reached the platform doesn't count against the pass.
    await usage.add(pass.id, -images, ttl);
    throw caught;
  }
}

/** Every request in flight, answered in one round trip. Next dispatches server
    actions one at a time per client, so a poll per run would queue ahead of the
    next submit. The fan-out belongs on this side of the call, where it is
    genuinely parallel. Polling keeps working after a pass expires so runs that
    were paid for still land. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  const requestIds = parseRequestIds(data);
  const client = createPlatformClient(houseCredentials());
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      try {
        return { requestId, status: await client.status(requestId) };
      } catch (caught) {
        return { requestId, error: caught instanceof Error ? caught.message : String(caught) };
      }
    }),
  );
}

async function requirePass(): Promise<Pass> {
  const pass = decodePass((await cookies()).get(PASS_COOKIE)?.value);
  if (!pass) throw new MissingPassError();
  return pass;
}

function houseCredentials() {
  const apiKey = process.env.DREAMCORP_PLATFORM_KEY;
  if (!apiKey) throw new Error("Studio is not configured: missing DREAMCORP_PLATFORM_KEY");
  const baseUrl = process.env.HF_API_BASE_URL;
  if (!baseUrl) throw new Error("Studio is not configured: missing HF_API_BASE_URL");
  return { apiKey, baseUrl };
}

function parseRequestIds(data: unknown): string[] {
  const payload = asObject(data, "Invalid status payload");
  const requestIds = payload.requestIds;
  if (!Array.isArray(requestIds) || requestIds.length === 0 || requestIds.length > 64) {
    throw new Error("Invalid request ids");
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId) throw new Error("Invalid request id");
    return requestId;
  });
}

function asObject(data: unknown, message: string): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error(message);
  return data as Record<string, unknown>;
}
