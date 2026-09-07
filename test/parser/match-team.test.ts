import { describe, expect, it } from "vitest";
import { matchTeamSheetName } from "@/lib/parser/match-team";

// PLAN.md §2.4 — verified against all 28 sheet names across the four sample
// workbooks: 24 team sheets match correctly, 4 non-team sheets are rejected.
const TEAM_SHEETS: [sheetName: string, team: string][] = [
    ["Engineering", "Engineering"],
    ["Management ", "Management"],
    ["Management", "Management"],
    ["Law", "Law"],
    ["Media", "Media/Liberal Arts"],
    ["Media & Liberal Arts", "Media/Liberal Arts"],
    ["Liberal Arts", "Media/Liberal Arts"],
    ["Design", "Design"],
    ["Inbound", "Inbound"],
];

const NON_TEAM_SHEETS = ["Overall ", "Report", "July Month Targets", "New Joiners"];

describe("matchTeamSheetName", () => {
    it.each(TEAM_SHEETS)('matches "%s" → %s', (sheetName, team) => {
        const result = matchTeamSheetName(sheetName);
        expect(result.matched).toBe(true);
        if (result.matched) {
            expect(result.team).toBe(team);
        }
    });

    it.each(NON_TEAM_SHEETS)('rejects "%s" as not a team sheet', (sheetName) => {
        const result = matchTeamSheetName(sheetName);
        expect(result.matched).toBe(false);
    });

    it("scores a mistyped title-like sheet name that still names a team", () => {
        // Aug's Design sheet title row reads "Design Month Design Team_Performance
        // Report" — the sheet *name* itself is just "Design", covered above; this
        // checks the fuzzy matcher tolerates the extra noise words too.
        const result = matchTeamSheetName("Design Month Design Team Performance Report");
        expect(result.matched).toBe(true);
        if (result.matched) {
            expect(result.team).toBe("Design");
        }
    });

    it("treats every canonical team name as self-matching", () => {
        for (const team of ["Design", "Engineering", "Inbound", "Law", "Management"]) {
            const result = matchTeamSheetName(team);
            expect(result.matched).toBe(true);
            if (result.matched) expect(result.team).toBe(team);
        }
    });
});
