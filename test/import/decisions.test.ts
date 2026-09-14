import { describe, expect, it } from "vitest";
import { buildImportPlan } from "@/lib/import/plan";
import type { ImportContext } from "@/lib/import/plan";
import { buildCommit, countByStatus, defaultChoices, deriveRows, isCommittable } from "@/lib/import/decisions";
import type { ImportRowInput } from "@/schemas/import";

const CONTEXT: ImportContext = {
    date: "2026-07",
    teams: [
        { id: 1, name: "Engineering" },
        { id: 2, name: "Law" },
    ],
    agencies: [{ id: 1, name: "AM2PM" }],
    roster: [
        { id: 10, name: "Asha Rao", email: "asha@x.in", merittoUserId: 1, roleName: "counsellor", teamId: 1, teamName: "Engineering", agencyId: 1, agencyName: "AM2PM", isActive: true },
        { id: 11, name: "Bimal Das", email: "bimal@x.in", merittoUserId: 2, roleName: "counsellor", teamId: 2, teamName: "Law", agencyId: null, agencyName: null, isActive: true },
        { id: 12, name: "Chitra Nair", email: "chitra@x.in", merittoUserId: 3, roleName: "counsellor", teamId: 1, teamName: "Engineering", agencyId: null, agencyName: null, isActive: true },
    ],
    entries: {
        10: { overall: 40, nonNegotiable: 36, achieved: null, achievedSource: "admissions", importId: null, teamId: 1, agencyId: 1 },
        11: { overall: 30, nonNegotiable: 27, achieved: 20, achievedSource: "admissions", importId: null, teamId: 2, agencyId: null },
    },
    liveAchieved: { 10: 12 },
};

function row(overrides: Partial<ImportRowInput> & { name: string; team: string; row: number }): ImportRowInput {
    return {
        rowId: `${overrides.team}:${String(overrides.row)}`,
        agency: null,
        email: null,
        target: 40,
        nonNegotiable: 36,
        achieved: null,
        sheet: overrides.team,
        ...overrides,
    };
}

describe("deriveRows / buildCommit", () => {
    it("classifies identical, conflicting, new-entry and new-user rows", () => {
        const rows = [
            row({ name: "Asha Rao", team: "Engineering", row: 2, agency: "AM2PM" }), // identical targets, achieved blank
            row({ name: "Bimal Das", team: "Law", row: 2, target: 35, nonNegotiable: 27, achieved: 22 }), // differs
            row({ name: "Chitra Nair", team: "Engineering", row: 3, achieved: 5 }), // no entry yet
            row({ name: "Dev Gautam", team: "Law", row: 3, email: "dev@x.in" }), // nobody
        ];
        const plan = buildImportPlan(rows, CONTEXT);
        const choices = defaultChoices(plan);
        const views = deriveRows(plan, choices);
        expect(views.map((v) => v.status)).toEqual(["no-change", "conflict", "insert", "create"]);
        expect(isCommittable(views)).toBe(false);

        choices.decisions["Law:2"] = { kind: "match", userId: 11, confirmed: true, take: "sheet", rewriteSnapshot: false, updateRoster: false };
        const resolved = deriveRows(plan, choices);
        expect(countByStatus(resolved)).toMatchObject({ "no-change": 1, update: 1, insert: 1, create: 1 });
        expect(isCommittable(resolved)).toBe(true);

        const commit = buildCommit(resolved, "2026-07", "July.xlsx");
        expect(commit.rows[0]).toEqual({ action: "skip", rowId: "Engineering:2" });
        expect(commit.rows[1]).toMatchObject({
            action: "upsert",
            userId: 11,
            writeTargets: true,
            writeAchieved: true,
            rewriteSnapshot: false,
            expected: { overall: 30, achieved: 20, teamId: 2 },
        });
        expect(commit.rows[2]).toMatchObject({ action: "upsert", userId: 12, writeTargets: true, writeAchieved: true, expected: null });
        expect(commit.rows[3]).toMatchObject({ action: "create", email: "dev@x.in", teamId: 2, agency: null });
    });

    it("flags a sheet total that disagrees with the daily count and blocks an unmapped team", () => {
        const rows = [
            row({ name: "Asha Rao", team: "Engineering", row: 2, agency: "AM2PM", achieved: 15 }),
            row({ name: "Bimal Das", team: "Pharmacy", row: 2 }),
        ];
        const plan = buildImportPlan(rows, CONTEXT);
        const views = deriveRows(plan, defaultChoices(plan));
        expect(views[0]?.status).toBe("conflict");
        expect(views[0]?.assessment?.flags.map((f) => f.code)).toContain("ACHIEVED_VS_LIVE");
        expect(views[1]?.status).toBe("team-unmapped");
    });

    it("treats a create without a valid email as invalid", () => {
        const plan = buildImportPlan([row({ name: "Dev Gautam", team: "Law", row: 3 })], CONTEXT);
        const views = deriveRows(plan, defaultChoices(plan));
        expect(views[0]?.status).toBe("invalid");
    });
});
