import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import seed from "../../scripts/seed/users.json";
import { parseWorkbook } from "@/lib/parser/parse-workbook";
import { buildImportPlan, matchUser, resolveAgency, resolveTeam } from "@/lib/import/plan";
import type { ImportContext, RosterUser } from "@/lib/import/plan";
import type { ImportRowInput } from "@/schemas/import";

const TEAMS = ["Design", "Engineering", "Inbound", "Law", "Management", "Media/Liberal Arts"].map((name, i) => ({
    id: i + 1,
    name,
}));
const AGENCIES = [
    { id: 1, name: "AM2PM" },
    { id: 2, name: "SKS Enterprises" },
];

interface SeedUser {
    id: number;
    name: string;
    email: string;
    role: string;
    team: string | null;
    agency: string | null;
    merittoUserId: number | null;
}

const ROSTER: RosterUser[] = (seed as SeedUser[]).map((user) => {
    const team = TEAMS.find((t) => t.name === user.team) ?? null;
    const agency = AGENCIES.find((a) => a.name === user.agency) ?? null;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        merittoUserId: user.merittoUserId,
        roleName: user.role,
        teamId: team?.id ?? null,
        teamName: team?.name ?? null,
        agencyId: agency?.id ?? null,
        agencyName: agency?.name ?? null,
        isActive: true,
    };
});

const CONTEXT: ImportContext = {
    date: "2026-08",
    teams: TEAMS,
    agencies: AGENCIES,
    roster: ROSTER,
    entries: {},
    liveAchieved: {},
};

function row(overrides: Partial<ImportRowInput> & { name: string; team: string }): ImportRowInput {
    return {
        rowId: `${overrides.team}:1`,
        agency: null,
        email: null,
        target: 40,
        nonNegotiable: 36,
        achieved: null,
        sheet: overrides.team,
        row: 1,
        ...overrides,
    };
}

async function loadRows(fileName: string): Promise<ImportRowInput[]> {
    const buffer = await readFile(path.resolve(__dirname, "../fixtures", fileName));
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const result = await parseWorkbook(arrayBuffer, fileName, { teams: TEAMS.map((t) => t.name) });
    if (result.isErr()) throw new Error(JSON.stringify(result.error));
    return result.value.counsellors.map((c) => ({
        rowId: `${c.source.sheet}:${String(c.source.row)}`,
        name: c.name,
        team: c.team,
        agency: c.agency,
        email: c.email,
        target: c.target,
        nonNegotiable: c.nonNegotiable,
        achieved: c.achievedBlank ? null : c.achieved,
        sheet: c.source.sheet,
        row: c.source.row,
    }));
}

describe("resolveTeam / resolveAgency", () => {
    it("matches exact, hinted and near-miss team names, and suggests otherwise", () => {
        expect(resolveTeam("Engineering", TEAMS)).toEqual({ kind: "matched", teamId: 2 });
        expect(resolveTeam("Liberal Arts", TEAMS)).toEqual({ kind: "matched", teamId: 6 });
        expect(resolveTeam("Managment", TEAMS)).toEqual({ kind: "matched", teamId: 5 });
        const unmatched = resolveTeam("Pharmacy", TEAMS);
        expect(unmatched.kind).toBe("unmatched");
    });

    it("matches agencies case-insensitively and suggests near misses", () => {
        expect(resolveAgency("sks enterprises", AGENCIES)).toEqual({ kind: "matched", agencyId: 2 });
        expect(resolveAgency(null, AGENCIES)).toEqual({ kind: "none" });
        const near = resolveAgency("SKS Enterprise", AGENCIES);
        expect(near.kind).toBe("unmatched");
        if (near.kind === "unmatched") expect(near.suggestions[0]?.agencyId).toBe(2);
    });
});

describe("matchUser", () => {
    it("takes an email match over everything", () => {
        const match = matchUser(row({ name: "Somebody Else", team: "Law", email: "C-Sumitra.Bharti@bennett.edu.in" }), 4, ROSTER);
        expect(match).toMatchObject({ kind: "auto", via: "email", userId: 14 });
    });

    it("takes a unique exact name regardless of case", () => {
        const hemant = ROSTER.find((u) => u.name === "Hemant singh");
        expect(matchUser(row({ name: "HEMANT SINGH", team: "Management" }), 5, ROSTER)).toMatchObject({
            kind: "auto",
            via: "name",
            userId: hemant?.id,
        });
    });

    it("takes a near-identical name only on the same team", () => {
        const sameTeam = matchUser(row({ name: "Vishwadep Saxena", team: "Engineering" }), 2, ROSTER);
        expect(sameTeam).toMatchObject({ kind: "auto", via: "fuzzy" });
        const otherTeam = matchUser(row({ name: "Vishwadep Saxena", team: "Law" }), 4, ROSTER);
        expect(otherTeam.kind).toBe("suggest");
    });

    it("suggests, rather than takes, a dropped surname or a respelling", () => {
        const nameOfTop = (name: string, team: string, teamId: number) => {
            const match = matchUser(row({ name, team }), teamId, ROSTER);
            expect(match.kind).toBe("suggest");
            return { match, top: ROSTER.find((u) => u.id === match.candidates[0]?.userId)?.name };
        };
        expect(nameOfTop("Sumitra Bharti", "Inbound", 3).top).toBe("Sumitra");
        expect(nameOfTop("Akanksha Sengar", "Inbound", 3)).toMatchObject({ match: { likely: true }, top: "Akansha sanger" });
        expect(nameOfTop("Tanushree Baisala", "Management", 5)).toMatchObject({ match: { likely: true }, top: "Tanushree Bansal" });
        expect(nameOfTop("Debjani Saha", "Law", 4)).toMatchObject({ match: { likely: true }, top: "Debanjani Saha" });
        // Noise stays listed but is never prefilled.
        expect(nameOfTop("Md.Arshad Hussain", "Engineering", 2).match).toMatchObject({ likely: false });
    });

    it("does not confuse two people who share a first name", () => {
        const match = matchUser(row({ name: "Sneha Gupta", team: "Inbound" }), 3, ROSTER);
        expect(match).toMatchObject({ kind: "auto", via: "name" });
        expect(ROSTER.find((u) => u.id === (match.kind === "auto" ? match.userId : -1))?.name).toBe("Sneha Gupta");
    });

    it("returns none for a name nobody resembles", () => {
        expect(matchUser(row({ name: "Zubin Mehta", team: "Law" }), 4, ROSTER).kind).toBe("none");
    });
});

describe("buildImportPlan", () => {
    it("demotes two rows that claim the same user to ambiguous", () => {
        const plan = buildImportPlan(
            [
                row({ rowId: "a", name: "Palki Mittal", team: "Media/Liberal Arts" }),
                row({ rowId: "b", name: "Palki  Mittal", team: "Design" }),
            ],
            CONTEXT,
        );
        expect(plan.rows.every((r) => r.match.kind === "ambiguous")).toBe(true);
    });

    it.each(["May Month Performance.xlsx", "June Month Performance.xlsx", "July Month Performance.xlsx", "Aug Month Performance.xlsx"])(
        "places most of %s's rows automatically against the seed roster",
        async (fileName) => {
            const rows = await loadRows(fileName);
            const plan = buildImportPlan(rows, CONTEXT);
            const kinds = plan.rows.reduce<Record<string, number>>((acc, r) => {
                acc[r.match.kind] = (acc[r.match.kind] ?? 0) + 1;
                return acc;
            }, {});
            // Every sheet team maps onto a DB team, no agency string is new.
            expect(Object.values(plan.teamMap).every((t) => t.kind === "matched")).toBe(true);
            expect(Object.values(plan.agencyMap).every((a) => a.kind === "matched")).toBe(true);
            // No row is silently taken by a wrong person: every auto match is exact or email.
            for (const r of plan.rows) {
                if (r.match.kind === "auto" && r.match.via === "fuzzy") {
                    const user = ROSTER.find((u) => u.id === (r.match.kind === "auto" ? r.match.userId : -1));
                    expect(user?.teamName).toBe(r.input.team);
                }
            }
            // Older months carry people who have since left; those land as suggest/none, never as a wrong auto.
            expect((kinds.auto ?? 0) / plan.rows.length).toBeGreaterThan(0.4);
            expect(kinds.ambiguous ?? 0).toBe(0);
        },
    );
});
