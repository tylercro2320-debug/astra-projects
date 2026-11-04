import "server-only";

/* Images generated per pass, for the fair-use cap.

   The default store is process memory. That works for `pnpm dev` and for a
   single long-lived server, but it resets on restart and isn't shared between
   serverless instances. For production on Vercel, set KV_REST_API_URL and
   KV_REST_API_TOKEN (Vercel KV / Upstash Redis) and the REST store below is
   used instead. It needs no extra dependency, just fetch. */

interface UsageStore {
  get(passId: string): Promise<number>;
  add(passId: string, amount: number, ttlSeconds: number): Promise<number>;
}

const memory = new Map<string, number>();

const memoryStore: UsageStore = {
  async get(passId) {
    return memory.get(passId) ?? 0;
  },
  async add(passId, amount) {
    const next = (memory.get(passId) ?? 0) + amount;
    memory.set(passId, next);
    return next;
  },
};

function restStore(url: string, token: string): UsageStore {
  const call = async (command: (string | number)[]) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Usage store error ${response.status}`);
    return ((await response.json()) as { result: unknown }).result;
  };
  return {
    async get(passId) {
      return Number(await call(["GET", `dc:usage:${passId}`])) || 0;
    },
    async add(passId, amount, ttlSeconds) {
      const next = Number(await call(["INCRBY", `dc:usage:${passId}`, amount])) || 0;
      await call(["EXPIRE", `dc:usage:${passId}`, Math.max(60, ttlSeconds)]);
      return next;
    },
  };
}

export const usage: UsageStore =
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
    ? restStore(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN)
    : memoryStore;
