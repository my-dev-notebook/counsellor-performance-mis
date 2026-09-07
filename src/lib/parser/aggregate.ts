import { summarize } from "@/lib/metrics/summarize";
import type { CanonicalTeam, Counsellor, DeclaredTotal, TeamAggregate, Warning } from "./schemas";
import { makeWarning } from "./warnings";

const RECONCILE_EPSILON = 0.01;

export interface AggregateOutcome {
    aggregate: TeamAggregate;
    warnings: Warning[];
}

/**
 * Stage 6 (PLAN.md §4, §6) — aggregate a team's counsellors and reconcile
 * against the sheet's own `Grand Total` row, if one exists. May has no total
 * rows at all → `reconciles: null` ("not checked"), not a failure.
 */
export function aggregateTeam(
    team: CanonicalTeam,
    counsellors: readonly Counsellor[],
    declaredTotal: DeclaredTotal | undefined,
    sheetName: string,
): AggregateOutcome {
    const warnings: Warning[] = [];
    const summary = summarize(counsellors);

    let reconciles: boolean | null = null;
    if (declaredTotal) {
        const targetMatches =
            declaredTotal.target === undefined || Math.abs(declaredTotal.target - summary.target) <= RECONCILE_EPSILON;
        const achievedMatches =
            declaredTotal.achieved === undefined ||
            Math.abs(declaredTotal.achieved - summary.achieved) <= RECONCILE_EPSILON;
        reconciles = targetMatches && achievedMatches;
        if (!reconciles) {
            warnings.push(
                makeWarning(
                    "warn",
                    "sheet",
                    "TOTAL_ROW_MISMATCH",
                    `Sheet's own Grand Total (target=${declaredTotal.target !== undefined ? String(declaredTotal.target) : "—"}, ` +
                        `achieved=${declaredTotal.achieved !== undefined ? String(declaredTotal.achieved) : "—"}) disagrees with ` +
                        `the computed total (target=${String(summary.target)}, achieved=${String(summary.achieved)}). The computed total is used.`,
                    { sheet: sheetName },
                ),
            );
        }
    }

    const aggregate: TeamAggregate = {
        team,
        ...summary,
        reconciles,
        ...(declaredTotal ? { declaredTotal } : {}),
    };

    return { aggregate, warnings };
}
