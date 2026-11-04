import { kv } from "@/server/env";

/* Serves images made by the built-in models. Ids are 128-bit random tokens,
   so a link works like a private share link. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{16,32}$/.test(id)) return new Response("Not found", { status: 404 });
  const store = await kv();
  const { value, metadata } = await store.getWithMetadata<{ type?: string }>(`media:${id}`, "arrayBuffer");
  if (!value) return new Response("This image has expired", { status: 404 });
  return new Response(value, {
    headers: {
      "Content-Type": metadata?.type === "image/png" ? "image/png" : "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
