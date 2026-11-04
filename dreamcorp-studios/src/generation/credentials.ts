/* Errors cross the server-action boundary as plain messages, so the studio
   matches on these exact strings, not on the class. */
export const MISSING_PASS_MESSAGE = "No active pass";
export const PASS_LIMIT_MESSAGE = "Pass limit reached";

export class MissingPassError extends Error {
  constructor() {
    super(MISSING_PASS_MESSAGE);
    this.name = "MissingPassError";
  }
}

export class PassLimitError extends Error {
  constructor(cap: number) {
    super(`${PASS_LIMIT_MESSAGE}: ${cap} images`);
    this.name = "PassLimitError";
  }
}

export function toAuthorizationHeader(apiKey: string): string {
  const colon = apiKey.indexOf(":");
  if (colon <= 0 || colon === apiKey.length - 1) {
    throw new Error("DREAMCORP_PLATFORM_KEY must be id:secret");
  }
  return `Key ${apiKey}`;
}
