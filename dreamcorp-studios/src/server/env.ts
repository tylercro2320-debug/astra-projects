import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/* The two Cloudflare bindings the backend uses. Typed by hand so the project
   doesn't need @cloudflare/workers-types for three methods. */

export interface KV {
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  getWithMetadata<M>(key: string, type: "arrayBuffer"): Promise<{ value: ArrayBuffer | null; metadata: M | null }>;
  put(key: string, value: string | ArrayBuffer, options?: { expirationTtl?: number; metadata?: unknown }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string; cursor?: string; limit?: number }): Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
}

export interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

interface Bindings {
  DC_KV?: KV;
  AI?: AiBinding;
}

async function bindings(): Promise<Bindings> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env as unknown as Bindings;
  } catch {
    return {};
  }
}

/* Outside Cloudflare (plain `next dev` / `next start`) there is no KV, so an
   in-memory stand-in keeps local development working. It is never used on
   Cloudflare because the binding is always present there. */
type Row = { value: string | ArrayBuffer; exp: number | null; metadata: unknown };
// On globalThis so every route bundle in the local server shares one store.
const memory: Map<string, Row> = ((globalThis as { __dcMemoryKV?: Map<string, Row> }).__dcMemoryKV ??= new Map());
const memoryKV: KV = {
  async get(key: string, type: "text" | "arrayBuffer") {
    const row = memory.get(key);
    if (!row || (row.exp !== null && row.exp < Date.now())) return null;
    if (type === "text") return typeof row.value === "string" ? row.value : new TextDecoder().decode(row.value);
    return typeof row.value === "string" ? new TextEncoder().encode(row.value).buffer : row.value;
  },
  async getWithMetadata<M>(key: string) {
    const row = memory.get(key);
    if (!row || (row.exp !== null && row.exp < Date.now())) return { value: null, metadata: null };
    const value = typeof row.value === "string" ? new TextEncoder().encode(row.value).buffer : row.value;
    return { value: value as ArrayBuffer, metadata: row.metadata as M };
  },
  async put(key, value, options) {
    memory.set(key, {
      value,
      exp: options?.expirationTtl ? Date.now() + options.expirationTtl * 1000 : null,
      metadata: options?.metadata ?? null,
    });
  },
  async delete(key) {
    memory.delete(key);
  },
  async list({ prefix }) {
    return { keys: [...memory.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true };
  },
} as KV;

export async function kv(): Promise<KV> {
  return (await bindings()).DC_KV ?? memoryKV;
}

export async function ai(): Promise<AiBinding | null> {
  return (await bindings()).AI ?? null;
}
