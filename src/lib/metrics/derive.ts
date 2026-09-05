/**
 * Single source of truth for derived per-counsellor metrics (PLAN.md §6).
 * These values are always recomputed from `target`/`achieved` and never
 * read from the sheet — §2.6 landmines #2 and #3 document why.
 */

export function derivePending(target: number | null, achieved: number | null): number | null {
  if (target === null || achieved === null) return null;
  return target - achieved;
}

export function derivePctAchieved(target: number | null, achieved: number | null): number | null {
  if (target === null || achieved === null || target <= 0) return null;
  return achieved / target;
}

export function deriveTargetGap(pending: number | null): number {
  if (pending === null) return 0;
  return Math.max(0, pending);
}

export function deriveBelowNonNegotiable(
  nonNegotiable: number | null,
  achieved: number | null,
): boolean | null {
  if (nonNegotiable === null || achieved === null) return null;
  return achieved < nonNegotiable;
}
