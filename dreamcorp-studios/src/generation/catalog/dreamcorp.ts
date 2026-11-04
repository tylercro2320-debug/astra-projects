import type { ModelEntry } from "./types";

/* DreamCorp's built-in models. They run on Cloudflare Workers AI through the
   AI binding, so they need no outside API key. Ids start with "dc-"; the
   server routes those to Workers AI instead of the partner platform. */

export const dcFlash: ModelEntry = {
  id: "dc-flash",
  surface: "image",
  label: "DreamCorp Flash",
  roles: {},
  settings: {
    quality: { type: "enum", values: ["fast", "detailed"], default: "detailed" },
  },
};

export const dcLightning: ModelEntry = {
  id: "dc-lightning",
  surface: "image",
  label: "DreamCorp Lightning",
  roles: {},
  settings: {
    aspectRatio: { type: "enum", values: ["1:1", "4:3", "3:4", "16:9", "9:16"], default: "1:1" },
  },
};

export const BUILT_IN_MODELS = [dcFlash, dcLightning];

export const WORKERS_AI_MODEL: Record<string, string> = {
  "dc-flash": "@cf/black-forest-labs/flux-1-schnell",
  "dc-lightning": "@cf/bytedance/stable-diffusion-xl-lightning",
};

const SIZES: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "4:3": [1152, 864],
  "3:4": [864, 1152],
  "16:9": [1280, 720],
  "9:16": [720, 1280],
};

export function workersAiInput(modelId: string, prompt: string, settings: Record<string, unknown>) {
  if (modelId === "dc-flash") {
    return { prompt, steps: settings.quality === "fast" ? 4 : 8 };
  }
  const [width, height] = SIZES[String(settings.aspectRatio)] ?? SIZES["1:1"]!;
  return { prompt, width, height, num_steps: 8 };
}
