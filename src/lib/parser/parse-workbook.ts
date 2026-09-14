import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import { aggregateTeam } from "./aggregate";
import { buildCounsellor } from "./build-row";
import { toNumber, toStringOrNull } from "./coerce";
import type { ParseError } from "./errors";
import { extractTableBody, locateHeaderRow } from "./locate-table";
import { mapColumns } from "./map-columns";
import { matchTeamSheetName } from "./match-team";
import { detectMonth } from "./month";
import { readWorkbook } from "./read";
import type { RawSheet } from "./read";
import type { Counsellor, ParsedWorkbook, TeamAggregate, Warning } from "@/schemas/parser";
import { CANONICAL_TEAMS } from "@/schemas/parser";
import { columnLetter } from "./util";
import { makeWarning } from "./warnings";

export interface ParseOptions {
    /**
     * Team names to recognise sheets by — the `teams` table in the live app.
     * Defaults to the six canonical names the fixtures use.
     */
    teams?: readonly string[];
    /**
     * Sheet name → team name, for sheets the matcher could not place that the
     * operator has mapped by hand on the import screen. An override wins over
     * the matcher; a sheet mapped to `null` is skipped without a warning.
     */
    sheetTeamOverrides?: Readonly<Record<string, string | null>>;
}

/**
 * Top-level orchestration of PLAN.md §4's six stages.
 *
 * Note on the signature: the plan writes `parseWorkbook(...): Result<...>`,
 * but `exceljs`'s `xlsx.load` is inherently async — stage 1 must be awaited,
 * so this returns `Promise<Result<...>>` rather than a bare `Result`. Every
 * stage below stage 1 is still pure/synchronous.
 */
export async function parseWorkbook(
    buffer: ArrayBuffer,
    sourceFileName: string,
    options: ParseOptions = {},
): Promise<Result<ParsedWorkbook, ParseError>> {
    const rawResult = await readWorkbook(buffer);
    if (rawResult.isErr()) return err(rawResult.error);
    const raw = rawResult.value;
    const teamNames = options.teams ?? CANONICAL_TEAMS;
    const overrides = options.sheetTeamOverrides ?? {};

    const warnings: Warning[] = [];
    const sheetsSeen: string[] = [];
    const teamSheets: { team: string; sheet: RawSheet }[] = [];
    const titleCandidates: string[] = [];

    for (const sheet of raw.sheets) {
        sheetsSeen.push(sheet.name);
        titleCandidates.push(sheet.name);
        const titleCell = toStringOrNull(sheet.grid[0]?.[0]);
        if (titleCell.value) titleCandidates.push(titleCell.value);

        if (sheet.name in overrides) {
            const override = overrides[sheet.name];
            if (override !== null && override !== undefined) teamSheets.push({ team: override, sheet });
            continue;
        }

        const match = matchTeamSheetName(sheet.name, teamNames);
        if (match.matched) {
            teamSheets.push({ team: match.team, sheet });
            continue;
        }

        const looksLikeRoster = sheetLooksLikeRoster(sheet);
        warnings.push(
            makeWarning(
                looksLikeRoster ? "warn" : "info",
                "sheet",
                "SHEET_IGNORED",
                looksLikeRoster
                    ? match.ambiguous
                        ? `Sheet "${sheet.name}" looks like a team roster but its name matches several teams (${match.candidates.join(", ")}) — it was skipped. Map it to a team to include it.`
                        : `Sheet "${sheet.name}" looks like a team roster (has a counsellor name and a target column) but its name did not match a known team — it was skipped. Map it to a team to include it.`
                    : `Sheet "${sheet.name}" does not match a known team and was skipped.`,
                { sheet: sheet.name },
            ),
        );
    }

    if (teamSheets.length === 0) {
        return err({ kind: "NoTeamSheetsFound", sheetsSeen, warnings });
    }

    const counsellors: Counsellor[] = [];
    const teams: TeamAggregate[] = [];
    const agencies = new Set<string>();

    for (const { team, sheet } of teamSheets) {
        const header = locateHeaderRow(sheet.grid);
        if (!header) {
            warnings.push(
                makeWarning(
                    "warn",
                    "sheet",
                    "NO_HEADER_FOUND",
                    `No header row found in sheet "${sheet.name}"; skipped.`,
                    {
                        sheet: sheet.name,
                    },
                ),
            );
            continue;
        }

        const { columns, unmapped, requiredMissing } = mapColumns(header.headerCells);
        for (const offset of unmapped) {
            warnings.push(
                makeWarning(
                    "info",
                    "cell",
                    "UNMAPPED_COLUMN",
                    `Unrecognised column header ignored in sheet "${sheet.name}".`,
                    {
                        sheet: sheet.name,
                        row: header.headerRowIndex + 1,
                        column: columnLetter(header.colStart + offset),
                    },
                ),
            );
        }
        if (requiredMissing.length > 0) {
            warnings.push(
                makeWarning(
                    "error",
                    "sheet",
                    "MISSING_REQUIRED_COLUMN",
                    `Sheet "${sheet.name}" is missing required column(s): ${requiredMissing.join(", ")}; skipped.`,
                    { sheet: sheet.name },
                ),
            );
            continue;
        }

        const { bodyRows, declaredTotalRow } = extractTableBody(sheet.grid, header, columns);

        const teamCounsellors: Counsellor[] = [];
        for (const row of bodyRows) {
            const outcome = buildCounsellor({
                cells: row.cells,
                columns,
                team,
                teams: teamNames,
                sheetName: sheet.name,
                excelRow: row.excelRow,
            });
            warnings.push(...outcome.warnings);
            if (outcome.counsellor) {
                teamCounsellors.push(outcome.counsellor);
                if (outcome.counsellor.agency) agencies.add(outcome.counsellor.agency);
            }
        }

        let declaredTotal: { target?: number; achieved?: number } | undefined;
        if (declaredTotalRow) {
            const targetTotal =
                columns.target !== undefined ? toNumber(declaredTotalRow.cells[columns.target]).value : null;
            const achievedTotal =
                columns.achieved !== undefined ? toNumber(declaredTotalRow.cells[columns.achieved]).value : null;
            declaredTotal = {
                ...(targetTotal !== null ? { target: targetTotal } : {}),
                ...(achievedTotal !== null ? { achieved: achievedTotal } : {}),
            };
        }

        const { aggregate, warnings: aggregateWarnings } = aggregateTeam(
            team,
            teamCounsellors,
            declaredTotal,
            sheet.name,
        );
        warnings.push(...aggregateWarnings);
        teams.push(aggregate);
        counsellors.push(...teamCounsellors);
    }

    const monthLabel = detectMonth(sourceFileName, titleCandidates);

    const workbook: ParsedWorkbook = {
        sourceFileName,
        monthLabel,
        teams: [...teams].sort((a, b) => a.team.localeCompare(b.team)),
        counsellors,
        agencies: Array.from(agencies).sort(),
        warnings,
    };

    return ok(workbook);
}

/** Escalation rule (PLAN.md §2.5) — an ignored sheet that has a name + target column is a likely dropped team. */
function sheetLooksLikeRoster(sheet: RawSheet): boolean {
    const header = locateHeaderRow(sheet.grid);
    if (!header) return false;
    const { columns } = mapColumns(header.headerCells);
    return columns.name !== undefined && columns.target !== undefined;
}
