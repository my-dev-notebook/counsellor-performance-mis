import type { Status } from "@/lib/parser/schemas";

/** Status bands (PLAN.md §6, ANS.md Q6). `Unknown` is never folded into `Red`. */
export function deriveStatus(pctAchieved: number | null): Status {
  if (pctAchieved === null) return "Unknown";
  if (pctAchieved >= 0.9) return "Green";
  if (pctAchieved >= 0.6) return "Yellow";
  return "Red";
}
