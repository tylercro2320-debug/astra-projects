/* The two passes DreamCorp Studios sells. Client-safe: no secrets, no env.
   Prices are in cents so nothing downstream ever rounds a float. */

export type PlanId = "day" | "week";

export interface Plan {
  id: PlanId;
  name: string;
  cents: number;
  /** How long one purchase stays active, in hours. */
  hours: number;
  /** What the price covers, in the words the pricing card uses. */
  per: string;
  /** Default fair-use ceiling on images per pass; DREAMCORP_CAP_DAY / _WEEK override it. */
  defaultCap: number;
}

export const PLANS: Record<PlanId, Plan> = {
  day: { id: "day", name: "Day Pass", cents: 100, hours: 24, per: "for 24 hours", defaultCap: 150 },
  week: { id: "week", name: "Week Pass", cents: 299, hours: 24 * 7, per: "for 7 days", defaultCap: 750 },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/** Status the studio reads; produced on the server by getPassStatus(). */
export interface PassStatus {
  active: boolean;
  plan: PlanId | null;
  expiresAt: number | null;
  used: number;
  cap: number;
}
