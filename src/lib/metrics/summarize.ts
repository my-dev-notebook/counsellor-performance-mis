import type { CanonicalTeam, Counsellor } from "@/schemas/parser";
import { CANONICAL_TEAMS } from "@/schemas/parser";

export interface Summary {
    headcount: number;
    target: number;
    nonNegotiable: number | null;
    achieved: number;
    targetGap: number;
    pctAchieved: number | null;
    pctAchievedExcludedCount: number;
    belowNonNegotiableCount: number | null;
}

/**
 * Single source of truth for "sum up a list of counsellors" (PLAN.md §6) —
 * used both for a sheet's team total (`aggregate.ts`, which adds
 * reconciliation on top) and for any filtered subset shown in the dashboard,
 * so a filter can never compute a percentage differently than the KPI cards.
 */
export function summarize(counsellors: readonly Counsellor[]): Summary {
    const headcount = counsellors.length;
    const target = counsellors.reduce((sum, c) => sum + (c.target ?? 0), 0);
    const achieved = counsellors.reduce((sum, c) => sum + (c.achieved ?? 0), 0);
    const targetGap = counsellors.reduce((sum, c) => sum + Math.max(0, c.pending ?? 0), 0);

    // §6: pctAchieved is Σachieved ÷ Σtarget over rows WITH a target — rows
    // with a null target are excluded from both sides, not treated as target 0.
    const withTarget = counsellors.filter((c) => c.target !== null);
    const targetWithTargetSum = withTarget.reduce((sum, c) => sum + (c.target ?? 0), 0);
    const achievedWithTargetSum = withTarget.reduce((sum, c) => sum + (c.achieved ?? 0), 0);
    const pctAchieved = targetWithTargetSum > 0 ? achievedWithTargetSum / targetWithTargetSum : null;
    const pctAchievedExcludedCount = headcount - withTarget.length;

    const withNonNegotiable = counsellors.filter((c) => c.nonNegotiable !== null);
    const nonNegotiable =
        withNonNegotiable.length > 0 ? withNonNegotiable.reduce((sum, c) => sum + (c.nonNegotiable ?? 0), 0) : null;
    const belowNonNegotiableCount =
        withNonNegotiable.length > 0 ? counsellors.filter((c) => c.belowNonNegotiable === true).length : null;

    return {
        headcount,
        target,
        nonNegotiable,
        achieved,
        targetGap,
        pctAchieved,
        pctAchievedExcludedCount,
        belowNonNegotiableCount,
    };
}

/** Groups counsellors by team, alphabetically, skipping teams absent from the current filter (PLAN.md §5.4). */
export function summarizeByTeam(counsellors: readonly Counsellor[]): { team: CanonicalTeam; summary: Summary }[] {
    return CANONICAL_TEAMS.map((team) => ({
        team,
        summary: summarize(counsellors.filter((c) => c.team === team)),
    })).filter((entry) => entry.summary.headcount > 0);
}
