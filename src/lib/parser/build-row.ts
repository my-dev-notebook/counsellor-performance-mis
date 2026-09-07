import { deriveBelowNonNegotiable, derivePctAchieved, derivePending } from "@/lib/metrics/derive";
import { deriveStatus } from "@/lib/metrics/buckets";
import { toBoolean, toDate, toNumber, toStringOrNull } from "./coerce";
import type { ColumnMap } from "./map-columns";
import { matchTeamSheetName } from "./match-team";
import type { CanonicalTeam, Counsellor, Warning } from "./schemas";
import { Counsellor as CounsellorSchema } from "./schemas";
import { slug } from "./util";
import { makeWarning } from "./warnings";

export interface BuildRowParams {
    cells: readonly unknown[];
    columns: ColumnMap;
    team: CanonicalTeam;
    sheetName: string;
    excelRow: number;
}

export interface BuildRowOutcome {
    counsellor: Counsellor | null;
    warnings: Warning[];
}

/** Stage 5 (PLAN.md §4) — coerce and validate one row. Never throws; `safeParse` only. */
export function buildCounsellor(params: BuildRowParams): BuildRowOutcome {
    const { cells, columns, team, sheetName, excelRow } = params;
    const warnings: Warning[] = [];
    const issues: string[] = [];

    const nameResult = columns.name !== undefined ? toStringOrNull(cells[columns.name]) : { value: null };
    const name = nameResult.value;
    if (name === null || name.trim() === "") {
        // Blank/whitespace name — not a counsellor row, and not a total row either
        // (that's already been excluded upstream by locate-table.ts). Skip quietly.
        return { counsellor: null, warnings };
    }

    const agencyResult = columns.agency !== undefined ? toStringOrNull(cells[columns.agency]) : { value: null };
    const dojResult = columns.doj !== undefined ? toDate(cells[columns.doj]) : { value: null };
    const emailResult = columns.email !== undefined ? toStringOrNull(cells[columns.email]) : { value: null };
    const targetResult = columns.target !== undefined ? toNumber(cells[columns.target]) : { value: null };
    const nonNegotiableResult =
        columns.nonNegotiable !== undefined ? toNumber(cells[columns.nonNegotiable]) : { value: null };
    const achievedResult = columns.achieved !== undefined ? toNumber(cells[columns.achieved]) : { value: null };
    const acknowledgmentResult =
        columns.acknowledgment !== undefined ? toBoolean(cells[columns.acknowledgment]) : { value: null };
    const feedbackResult = columns.feedback !== undefined ? toStringOrNull(cells[columns.feedback]) : { value: null };

    for (const [field, result] of [
        ["agency", agencyResult],
        ["doj", dojResult],
        ["email", emailResult],
        ["target", targetResult],
        ["nonNegotiable", nonNegotiableResult],
        ["achieved", achievedResult],
        ["acknowledgment", acknowledgmentResult],
        ["feedback", feedbackResult],
    ] as const) {
        if (result.issue) issues.push(`${field}:${result.issue}`);
    }

    // Cross-check the row's own Team Name column against the sheet's resolved
    // team (Aug only has this column) — warn on mismatch, never override (§4 stage 5).
    if (columns.team !== undefined) {
        const rawTeam = toStringOrNull(cells[columns.team]);
        if (rawTeam.value) {
            const crossMatch = matchTeamSheetName(rawTeam.value);
            if (crossMatch.matched && crossMatch.team !== team) {
                warnings.push(
                    makeWarning(
                        "warn",
                        "row",
                        "TEAM_MISMATCH",
                        `Row's Team Name "${rawTeam.value}" resolves to ${crossMatch.team}, but this is the ${team} sheet.`,
                        { sheet: sheetName, row: excelRow },
                    ),
                );
            }
        }
    }

    const target = targetResult.value;
    // A genuinely blank Achieved cell (no coercion issue) means "not yet
    // entered" — it degrades to 0, not null, so totals/% show 0 rather than
    // "unknown" (PLAN.md §2.6.5 / §7 — the whole Aug workbook is like this).
    // A junk value (_, NA, an Excel error) is a real data-quality problem and
    // stays null.
    const achieved = achievedResult.value === null && achievedResult.issue === undefined ? 0 : achievedResult.value;
    const pending = derivePending(target, achieved);
    const pctAchieved = derivePctAchieved(target, achieved);
    const status = deriveStatus(pctAchieved);
    const belowNonNegotiable = deriveBelowNonNegotiable(nonNegotiableResult.value, achieved);

    const candidate: Counsellor = {
        id: `${slug(name)}@${slug(team)}`,
        name: name.trim(),
        team,
        agency: agencyResult.value,
        doj: dojResult.value,
        email: emailResult.value,
        target,
        nonNegotiable: nonNegotiableResult.value,
        achieved,
        acknowledgment: acknowledgmentResult.value,
        feedback: feedbackResult.value,
        pending,
        pctAchieved,
        status,
        belowNonNegotiable,
        source: { sheet: sheetName, row: excelRow },
        issues,
    };

    const parsed = CounsellorSchema.safeParse(candidate);
    if (!parsed.success) {
        warnings.push(
            makeWarning("warn", "row", "ROW_VALIDATION_FAILED", parsed.error.issues.map((i) => i.message).join("; "), {
                sheet: sheetName,
                row: excelRow,
            }),
        );
        return { counsellor: null, warnings };
    }

    return { counsellor: parsed.data, warnings };
}
