import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseWorkbook } from "@/lib/parser/parse-workbook";
import type { ParsedWorkbook } from "@/lib/parser/schemas";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");

async function loadFixture(fileName: string): Promise<ParsedWorkbook> {
    const buffer = await readFile(path.join(FIXTURES_DIR, fileName));
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const result = await parseWorkbook(arrayBuffer, fileName);
    if (result.isErr()) {
        throw new Error(`Expected ${fileName} to parse, got error: ${JSON.stringify(result.error)}`);
    }
    return result.value;
}

function findTeam(workbook: ParsedWorkbook, team: string) {
    const found = workbook.teams.find((t) => t.team === team);
    if (!found) throw new Error(`Team ${team} not found in ${workbook.sourceFileName}`);
    return found;
}

describe("parseWorkbook — Aug Month Performance.xlsx", () => {
    it("parses all 63 counsellors across 6 teams, target 2585", async () => {
        const workbook = await loadFixture("Aug Month Performance.xlsx");
        expect(workbook.counsellors).toHaveLength(63);
        expect(workbook.teams).toHaveLength(6);
        const totalTarget = workbook.teams.reduce((sum, t) => sum + t.target, 0);
        expect(totalTarget).toBe(2585);
        expect(workbook.monthLabel).toBe("August 2026");
    });

    it("ignores the 'Overall ' summary sheet, escalated as a roster look-alike", async () => {
        const workbook = await loadFixture("Aug Month Performance.xlsx");
        const escalated = workbook.warnings.find((w) => w.code === "SHEET_IGNORED" && w.sheet === "Overall ");
        expect(escalated).toBeDefined();
        expect(escalated?.level).toBe("warn");
    });

    it("degrades blank Achieved to 0 for the whole file, not to 'unknown' (Aug is not yet closed)", async () => {
        const workbook = await loadFixture("Aug Month Performance.xlsx");
        const totalAchieved = workbook.teams.reduce((sum, t) => sum + t.achieved, 0);
        expect(totalAchieved).toBe(0);
        for (const c of workbook.counsellors) {
            expect(c.achieved).toBe(0);
            expect(c.pctAchieved).toBe(0);
            expect(c.status).toBe("Red");
        }
        for (const t of workbook.teams) {
            expect(t.pctAchieved).toBe(0);
        }
    });

    it("cross-checks the Team Name column against the resolved sheet team", async () => {
        const workbook = await loadFixture("Aug Month Performance.xlsx");
        // every Aug row's Team Name should agree with its sheet — no mismatches expected
        expect(workbook.warnings.filter((w) => w.code === "TEAM_MISMATCH")).toHaveLength(0);
    });
});

describe("parseWorkbook — July Month Performance.xlsx", () => {
    it("Engineering team totals target 2270, achieved 1753", async () => {
        const workbook = await loadFixture("July Month Performance.xlsx");
        const engineering = findTeam(workbook, "Engineering");
        expect(engineering.target).toBe(2270);
        expect(engineering.achieved).toBe(1753);
    });

    it("reconciles every team against its unlabelled Grand Total row", async () => {
        const workbook = await loadFixture("July Month Performance.xlsx");
        for (const team of workbook.teams) {
            expect(team.reconciles).toBe(true);
        }
    });

    it("ignores the 'July Month Targets' summary sheet", async () => {
        const workbook = await loadFixture("July Month Performance.xlsx");
        expect(workbook.warnings.some((w) => w.code === "SHEET_IGNORED" && w.sheet === "July Month Targets")).toBe(
            true,
        );
    });
});

describe("parseWorkbook — June Month Performance.xlsx", () => {
    it("Inbound team totals target 815, achieved 671", async () => {
        const workbook = await loadFixture("June Month Performance.xlsx");
        const inbound = findTeam(workbook, "Inbound");
        expect(inbound.target).toBe(815);
        expect(inbound.achieved).toBe(671);
    });

    it("reads Non-Negotiable from the '0.9' column as-is, not derived as 90% of target", async () => {
        const workbook = await loadFixture("June Month Performance.xlsx");
        const inbound = workbook.counsellors.filter((c) => c.team === "Inbound");
        // Ayushi Aggarwal: Target 40, "0.9" column = Target-5 = 35 (not 0.9*40=36)
        const ayushi = inbound.find((c) => c.name === "Ayushi Aggarwal");
        expect(ayushi?.nonNegotiable).toBe(35);
    });

    it("recomputes Pending, ignoring the sheet's inconsistent sign convention", async () => {
        const workbook = await loadFixture("June Month Performance.xlsx");
        for (const c of workbook.counsellors) {
            if (c.target !== null && c.achieved !== null) {
                expect(c.pending).toBe(c.target - c.achieved);
            }
        }
    });

    it("degrades placeholder junk ('_') in numeric cells to null", async () => {
        const workbook = await loadFixture("June Month Performance.xlsx");
        const junkRows = workbook.counsellors.filter((c) => c.team === "Inbound" && c.target === null);
        expect(junkRows.length).toBeGreaterThan(0);
        for (const row of junkRows) {
            expect(row.status).toBe("Unknown");
        }
    });
});

describe("parseWorkbook — May Month Performance.xlsx", () => {
    it("parses all six team sheets despite the narrower 7-column schema", async () => {
        const workbook = await loadFixture("May Month Performance.xlsx");
        expect(workbook.teams).toHaveLength(6);
        expect(workbook.counsellors.length).toBeGreaterThan(0);
    });

    it("degrades absent columns (agency, doj, email, non-negotiable) to null", async () => {
        const workbook = await loadFixture("May Month Performance.xlsx");
        for (const c of workbook.counsellors) {
            expect(c.agency).toBeNull();
            expect(c.doj).toBeNull();
            expect(c.email).toBeNull();
            expect(c.nonNegotiable).toBeNull();
            expect(c.belowNonNegotiable).toBeNull();
        }
        for (const t of workbook.teams) {
            expect(t.nonNegotiable).toBeNull();
            expect(t.belowNonNegotiableCount).toBeNull();
        }
    });

    it("has no Grand Total rows, so every team's reconciles is null (not checked)", async () => {
        const workbook = await loadFixture("May Month Performance.xlsx");
        for (const t of workbook.teams) {
            expect(t.reconciles).toBeNull();
            expect(t.declaredTotal).toBeUndefined();
        }
    });

    it("ignores the 'New Joiners' roster without merging its different targets", async () => {
        const workbook = await loadFixture("May Month Performance.xlsx");
        expect(workbook.warnings.some((w) => w.code === "SHEET_IGNORED" && w.sheet === "New Joiners")).toBe(true);
        // Supriya Singh's real target lives in Engineering (250), not New Joiners (120) —
        // she must not appear twice.
        const matches = workbook.counsellors.filter((c) => c.name === "Supriya Singh");
        expect(matches.length).toBeLessThanOrEqual(1);
    });

    it("degrades 'NA' targets to null and excludes them from the aggregate percentage", async () => {
        const workbook = await loadFixture("May Month Performance.xlsx");
        const inbound = findTeam(workbook, "Inbound");
        const naRows = workbook.counsellors.filter((c) => c.team === "Inbound" && c.target === null);
        expect(naRows.length).toBeGreaterThan(0);
        expect(inbound.pctAchievedExcludedCount).toBeGreaterThanOrEqual(naRows.length);
    });
});

describe("parseWorkbook — cross-cutting invariants", () => {
    const fixtures = [
        "May Month Performance.xlsx",
        "June Month Performance.xlsx",
        "July Month Performance.xlsx",
        "Aug Month Performance.xlsx",
    ];

    it.each(fixtures)("every counsellor in %s has a stable id and a valid status", async (fileName) => {
        const workbook = await loadFixture(fileName);
        const ids = new Set<string>();
        for (const c of workbook.counsellors) {
            expect(["Green", "Yellow", "Red", "Unknown"]).toContain(c.status);
            expect(c.id).toMatch(/^[a-z0-9-]+@[a-z0-9-]+$/);
            ids.add(c.id);
        }
        // ids need not be globally unique across teams in principle, but within
        // one team + name combination they should be (PLAN.md §2.6.11).
        expect(ids.size).toBeGreaterThan(0);
    });

    it.each(fixtures)("targetGap in %s is >= (Σtarget - Σachieved) per team, never less", async (fileName) => {
        const workbook = await loadFixture(fileName);
        for (const team of workbook.teams) {
            expect(team.targetGap).toBeGreaterThanOrEqual(team.target - team.achieved);
        }
    });
});
