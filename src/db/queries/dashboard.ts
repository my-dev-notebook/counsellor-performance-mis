import type { Counsellor, ParsedWorkbook, TeamAggregate } from "@/schemas/parser";
import { aggregateTeam } from "@/lib/parser/aggregate";
import { deriveBelowNonNegotiable, derivePctAchieved, derivePending } from "@/lib/metrics/derive";
import { deriveStatus } from "@/lib/metrics/buckets";
import { MONTH_NAMES, formatMonthLabel } from "@/lib/format";
import { teamOptions } from "@/lib/filters";
import { getProgressForMonth, listMonthsWithData } from "./performance";
import type { PerformanceEntry, ProgressRow, UserRow } from "@/db/types";
import type { Scope } from "@/lib/auth/permissions";
import { rowVisible } from "@/lib/auth/permissions";
import { formatSessionSpan, sessionOfMonth } from "@/schemas/dates";

function hasEntry(row: ProgressRow): row is ProgressRow & { entry: PerformanceEntry } {
    return row.entry !== null;
}

/** The raw numbers one dashboard row is built from, before any derivation. */
interface RowFigures {
    counsellor: UserRow;
    team: string;
    teamId: number | null;
    target: number | null;
    nonNegotiable: number | null;
    achieved: number;
}

/**
 * Turns one row's figures into the parser's `Counsellor` shape, recomputing
 * every derived field (pending, %, status, below-NN) the same way the Excel
 * path does, so the dashboard never sees two different definitions.
 */
function toCounsellor({ counsellor, team, target, nonNegotiable, achieved }: RowFigures): Counsellor {
    const pending = derivePending(target, achieved);
    const pctAchieved = derivePctAchieved(target, achieved);
    return {
        id: String(counsellor.id),
        name: counsellor.name,
        team,
        agency: counsellor.agencyName,
        // Always null — `doj` is not stored. The parser's `Counsellor`
        // shape keeps the field because Excel sheets still carry a DOJ
        // column, but nothing persists it.
        doj: null,
        email: counsellor.email,
        target,
        nonNegotiable,
        achieved,
        achievedBlank: false,
        acknowledgment: null,
        feedback: null,
        pending,
        pctAchieved,
        status: deriveStatus(pctAchieved),
        belowNonNegotiable: deriveBelowNonNegotiable(nonNegotiable, achieved),
        source: { sheet: team, row: counsellor.id },
        issues: [],
    };
}

/**
 * Assembles the workbook from a scope's team-level rows: team aggregates are
 * computed over EVERY row (so a counsellor still sees their team's totals),
 * then the individual `counsellors` list is trimmed to the rows the scope may
 * see one by one.
 */
function buildWorkbook(rows: readonly RowFigures[], label: string, scope: Scope): ParsedWorkbook {
    const counsellors = rows.map(toCounsellor);
    const agencies = new Set<string>();
    for (const row of rows) if (row.counsellor.agencyName) agencies.add(row.counsellor.agencyName);

    const teams: TeamAggregate[] = teamOptions(counsellors).map(
        (team) =>
            aggregateTeam(
                team,
                counsellors.filter((c) => c.team === team),
                undefined,
                team,
            ).aggregate,
    );

    const visibleIds = new Set(
        rows
            .filter((row) => rowVisible(scope, { userId: row.counsellor.id, teamId: row.teamId }))
            .map((row) => String(row.counsellor.id)),
    );

    return {
        sourceFileName: "database",
        monthLabel: label,
        teams: teams.sort((a, b) => a.team.localeCompare(b.team)),
        counsellors: counsellors.filter((c) => visibleIds.has(c.id)),
        agencies: Array.from(agencies).sort(),
        warnings: [],
    };
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

    const rows: RowFigures[] = [];
    for (const row of progress) {
        if (!hasEntry(row)) continue;
        // The snapshot team was deleted (only possible when nothing referenced it), so this can't happen in practice.
        if (row.teamName === null) continue;
        rows.push({
            counsellor: row.counsellor,
            team: row.teamName,
            teamId: row.teamId,
            target: row.entry.overall,
            nonNegotiable: row.entry.nonNegotiable,
            // Blank Achieved degrades to 0 (mirrors the Excel-import rule in
            // src/lib/parser/build-row.ts). getProgressForMonth already resolves a
            // null `achieved` to the live daily-sum, so this is just the last-mile
            // null-to-0 fallback.
            achieved: row.entry.achieved ?? 0,
        });
    }

    return buildWorkbook(rows, formatMonthLabel(date), scope);
}

/** Adds a nullable monthly figure into a running yearly sum; stays null until the first non-null month. */
function addNullable(sum: number | null, value: number | null): number | null {
    return value === null ? sum : (sum ?? 0) + value;
}

/** "Session 2027 (Oct 2026 – Mar 2027)" — the session year plus the span of months it actually has data for. */
function formatYearLabel(year: string, months: readonly string[]): string {
    const first = months[0];
    const last = months[months.length - 1];
    if (!first || !last) return `Session ${year} (${formatSessionSpan(year)})`;
    const abbr = (date: string) =>
        `${MONTH_NAMES[Number.parseInt(date.slice(5), 10) - 1]?.slice(0, 3) ?? "?"} ${date.slice(0, 4)}`;
    return first === last
        ? `Session ${year} (${abbr(first)})`
        : `Session ${year} (${abbr(first)} – ${abbr(last)})`;
}

/**
 * The yearly counterpart of `getMonthlyWorkbook`: one row per counsellor with
 * Target / Non-Negotiable / Achieved SUMMED over every month of the SESSION
 * `year` ("YYYY", October of the previous calendar year through September —
 * see `sessionOfMonth`) that has data, so the same `Dashboard` renders a
 * whole session.
 *
 * A counsellor is filed under the team of their LATEST month in the year; a
 * mid-year team move therefore shows the whole year's numbers under the new
 * team. Under a team-leader scope only the months spent on that team are
 * admitted in the first place (each month is scope-filtered on its snapshot
 * team), so the leader sees exactly the months they were responsible for.
 *
 * Target and Non-Negotiable stay null only when every month left them blank;
 * a partially-set target is the sum of the months that did set one.
 */
export async function getYearlyWorkbook(year: string, scope: Scope): Promise<ParsedWorkbook> {
    const months = (await listMonthsWithData(scope))
        .filter((m) => sessionOfMonth(m) === year)
        .sort((a, b) => a.localeCompare(b));

    const perMonth = await Promise.all(
        months.map((date) => getProgressForMonth(date, scope, { includeInactive: true, teamLevel: true })),
    );

    // Months are ascending, so the last write to a counsellor's team/teamId wins — that is the latest month.
    const byCounsellor = new Map<number, RowFigures>();
    for (const progress of perMonth) {
        for (const row of progress) {
            if (!hasEntry(row)) continue;
            if (row.teamName === null) continue;
            const prev = byCounsellor.get(row.counsellor.id);
            byCounsellor.set(row.counsellor.id, {
                counsellor: row.counsellor,
                team: row.teamName,
                teamId: row.teamId,
                target: addNullable(prev?.target ?? null, row.entry.overall),
                nonNegotiable: addNullable(prev?.nonNegotiable ?? null, row.entry.nonNegotiable),
                achieved: (prev?.achieved ?? 0) + (row.entry.achieved ?? 0),
            });
        }
    }

    const rows = Array.from(byCounsellor.values()).sort((a, b) => a.counsellor.name.localeCompare(b.counsellor.name));
    return buildWorkbook(rows, formatYearLabel(year, months), scope);
}
