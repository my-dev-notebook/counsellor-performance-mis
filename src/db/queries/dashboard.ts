import { CanonicalTeam, CANONICAL_TEAMS } from "@/schemas/parser";
import type { Counsellor, ParsedWorkbook, TeamAggregate } from "@/schemas/parser";
import { aggregateTeam } from "@/lib/parser/aggregate";
import { deriveBelowNonNegotiable, derivePctAchieved, derivePending } from "@/lib/metrics/derive";
import { deriveStatus } from "@/lib/metrics/buckets";
import { formatMonthLabel } from "@/lib/format";
import { getProgressForMonth } from "./performance";
import type { PerformanceEntry, ProgressRow } from "@/db/types";
import type { Scope } from "@/lib/auth/permissions";
import { rowVisible } from "@/lib/auth/permissions";

function hasEntry(row: ProgressRow): row is ProgressRow & { entry: PerformanceEntry } {
    return row.entry !== null;
}

/**
 * Builds a `ParsedWorkbook`-shaped snapshot of one month (given as a
 * "YYYY-MM" date string) straight from the database, so the same
 * `Dashboard` component that renders an ad-hoc Excel upload (`/upload`) can
 * also render live data.
 *
 * Only counsellors with an actual `counsellor_perf_monthly` row for this
 * month are included — matching what an Excel sheet for that month would
 * have shown (someone with nothing recorded doesn't appear at all).
 *
 * The team each counsellor is filed under is the entry's SNAPSHOT team, not
 * the user's current one, so a past month keeps reading the way it did then.
 *
 * Scope: team aggregates are computed over every row the scope's team-level
 * filter admits, and the individual `counsellors` list is then trimmed to the
 * rows the scope may see one by one — for a counsellor that means their own
 * row plus their team's totals.
 */
export async function getMonthlyWorkbook(date: string, scope: Scope): Promise<ParsedWorkbook> {
    const progress = await getProgressForMonth(date, scope, { includeInactive: true, teamLevel: true });

    const counsellors: Counsellor[] = [];
    const agencySet = new Set<string>();

    for (const row of progress) {
        if (!hasEntry(row)) continue;
        const parsedTeam = CanonicalTeam.safeParse(row.teamName);
        if (!parsedTeam.success) continue;

        const target = row.entry.overall;
        const nonNegotiable = row.entry.nonNegotiable;
        // Blank Achieved degrades to 0 (mirrors the Excel-import rule in
        // src/lib/parser/build-row.ts). getProgressForMonth already resolves a
        // null `achieved` to the live daily-sum, so this is just the last-mile
        // null-to-0 fallback.
        const achieved = row.entry.achieved ?? 0;
        const pending = derivePending(target, achieved);
        const pctAchieved = derivePctAchieved(target, achieved);

        if (row.counsellor.agencyName) agencySet.add(row.counsellor.agencyName);

        counsellors.push({
            id: String(row.counsellor.id),
            name: row.counsellor.name,
            team: parsedTeam.data,
            agency: row.counsellor.agencyName,
            // Always null — `doj` is not stored. The parser's `Counsellor`
            // shape keeps the field because Excel sheets still carry a DOJ
            // column, but nothing persists it.
            doj: null,
            email: row.counsellor.email,
            target,
            nonNegotiable,
            achieved,
            acknowledgment: null,
            feedback: null,
            pending,
            pctAchieved,
            status: deriveStatus(pctAchieved),
            belowNonNegotiable: deriveBelowNonNegotiable(nonNegotiable, achieved),
            source: { sheet: parsedTeam.data, row: row.counsellor.id },
            issues: [],
        });
    }

    const teams: TeamAggregate[] = CANONICAL_TEAMS.map(
        (team) =>
            aggregateTeam(
                team,
                counsellors.filter((c) => c.team === team),
                undefined,
                team,
            ).aggregate,
    ).filter((t) => t.headcount > 0);

    const visibleIds = new Set(
        progress
            .filter((row) => rowVisible(scope, { userId: row.counsellor.id, teamId: row.teamId }))
            .map((row) => String(row.counsellor.id)),
    );

    return {
        sourceFileName: "database",
        monthLabel: formatMonthLabel(date),
        teams: teams.sort((a, b) => a.team.localeCompare(b.team)),
        counsellors: counsellors.filter((c) => visibleIds.has(c.id)),
        agencies: Array.from(agencySet).sort(),
        warnings: [],
    };
}
