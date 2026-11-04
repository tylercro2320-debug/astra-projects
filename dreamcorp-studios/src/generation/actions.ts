"use server";

import { accessFor, addUsage, currentUser, type User } from "@/server/accounts";
import { ai, kv } from "@/server/env";
import { randomToken } from "@/server/crypto";
import { countSetting } from "@/studio/data";

import { getModel, parseSettings } from "./catalog";
import { WORKERS_AI_MODEL, workersAiInput } from "./catalog/dreamcorp";
import type { GenerationPlane } from "./catalog/types";
import { MissingPassError, PassLimitError } from "./credentials";
import { createPlatformClient } from "./platform";
import type { GenerationStatus, QueuedGeneration, StatusResult } from "./platform";
import { toPlatform } from "./to-platform";

/* Every generate needs a signed-in account with active access. Built-in models
   ("dc-*") run on Cloudflare Workers AI and need no key; partner models use
   DREAMCORP_PLATFORM_KEY. Customer image limits are charged before the request
   leaves and refunded if it fails. Developer and admin accounts are unlimited. */

const MEDIA_TTL = 60 * 60 * 24 * 30;
const BUILT_IN_PREFIX = "dc_";

export async function submitGeneration(plane: GenerationPlane): Promise<QueuedGeneration> {
  const user = await requireAccess();
  const model = getModel(plane.model);
  const parsed: GenerationPlane = { ...plane, settings: parseSettings(model, plane.settings) };
  const prompt = parsed.prompt.text.trim().slice(0, 2000);
  if (!prompt) throw new Error("Write a prompt first");

  const native = countSetting(model);
  const images = native ? Math.max(1, Number(parsed.settings[native.key]) || 1) : 1;
  const charged = user.cap !== null;
  if (charged) {
    const access = await accessFor(user);
    if (access.used + images > user.cap!) throw new PassLimitError(user.cap!);
    await addUsage(user, images);
  }

  try {
    if (model.id in WORKERS_AI_MODEL) return await runBuiltIn(model.id, prompt, parsed.settings);
    const { path, body } = toPlatform(parsed);
    return await createPlatformClient(houseCredentials()).submit(path, body);
  } catch (caught) {
    if (charged) await addUsage(user, -images);
    throw caught;
  }
}

async function runBuiltIn(modelId: string, prompt: string, settings: Record<string, unknown>): Promise<QueuedGeneration> {
  const binding = await ai();
  if (!binding) throw new Error("Built-in models only run on Cloudflare (AI binding missing)");
  const result = await binding.run(WORKERS_AI_MODEL[modelId]!, workersAiInput(modelId, prompt, settings));
  const { bytes, type } = await toImage(result);
  const id = randomToken(16);
  const store = await kv();
  await store.put(`media:${id}`, bytes, { expirationTtl: MEDIA_TTL, metadata: { type } });
  const requestId = `${BUILT_IN_PREFIX}${id}`;
  return { status: "completed", requestId, statusUrl: "", cancelUrl: "" };
}

/** Workers AI answers with base64 JSON (Flux) or raw PNG bytes (SDXL). */
async function toImage(result: unknown): Promise<{ bytes: ArrayBuffer; type: string }> {
  if (result && typeof result === "object" && "image" in result && typeof (result as { image: unknown }).image === "string") {
    const b64 = (result as { image: string }).image;
    const raw = atob(b64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return { bytes: out.buffer, type: "image/jpeg" };
  }
  if (result instanceof ReadableStream) {
    return { bytes: await new Response(result).arrayBuffer(), type: "image/png" };
  }
  if (result instanceof Uint8Array) {
    return { bytes: result.slice().buffer, type: "image/png" };
  }
  if (result instanceof ArrayBuffer) return { bytes: result, type: "image/png" };
  throw new Error("The model returned no image. Try a different prompt.");
}

/** Every request in flight, answered in one round trip. Built-in runs finish
    inside the submit, so their status is answered locally. Polling keeps
    working after access ends so runs that were paid for still land. */
export async function getGenerationStatuses(data: unknown): Promise<StatusResult[]> {
  const requestIds = parseRequestIds(data);
  const partner = requestIds.some((id) => !id.startsWith(BUILT_IN_PREFIX));
  const client = partner ? createPlatformClient(houseCredentials()) : null;
  return Promise.all(
    requestIds.map(async (requestId): Promise<StatusResult> => {
      if (requestId.startsWith(BUILT_IN_PREFIX)) {
        const status: GenerationStatus = {
          status: "completed",
          requestId,
          images: [{ url: `/api/media/${requestId.slice(BUILT_IN_PREFIX.length)}` }],
        };
        return { requestId, status };
      }
      try {
        return { requestId, status: await client!.status(requestId) };
      } catch (caught) {
        return { requestId, error: caught instanceof Error ? caught.message : String(caught) };
      }
    }),
  );
}

async function requireAccess(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new MissingPassError();
  const access = await accessFor(user);
  if (!access.active) {
    if (access.reason === "limit") throw new PassLimitError(user.cap ?? 0);
    throw new MissingPassError();
  }
  return user;
}

function houseCredentials() {
  const apiKey = process.env.DREAMCORP_PLATFORM_KEY;
  if (!apiKey) throw new Error("Partner models aren't configured: missing DREAMCORP_PLATFORM_KEY");
  const baseUrl = process.env.HF_API_BASE_URL;
  if (!baseUrl) throw new Error("Partner models aren't configured: missing HF_API_BASE_URL");
  return { apiKey, baseUrl };
}

function parseRequestIds(data: unknown): string[] {
  if (data === null || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid status payload");
  const requestIds = (data as Record<string, unknown>).requestIds;
  if (!Array.isArray(requestIds) || requestIds.length === 0 || requestIds.length > 64) {
    throw new Error("Invalid request ids");
  }
  return requestIds.map((requestId) => {
    if (typeof requestId !== "string" || !requestId || requestId.length > 200) throw new Error("Invalid request id");
    return requestId;
  });
}
