import type { AchievedSource } from "@/schemas/achieved-source";
import type { ImportRowInput } from "@/schemas/import";
import { normalizeText, rankCandidates } from "@/lib/matching/similarity";
import { matchTeamSheetName } from "@/lib/parser/match-team";

/**
 * The import plan: pure matching of parsed sheet rows against the roster,
 * teams and agencies. No DB access — the server action loads an
 * `ImportContext` (src/db/queries/imports.ts) and hands it here, and the
 * review screen keeps the same context so it can re-assess a row when the
 * operator changes a decision (src/lib/import/assess.ts).
 */

/** A name this similar (and unique) is taken without asking. */
export const AUTO_THRESHOLD = 0.9;
/** A suggestion this strong is prefilled as the pick; weaker ones are only listed. */
export const LIKELY_THRESHOLD = 0.75;
/** Below this a candidate is not even suggested. */
export const SUGGEST_THRESHOLD = 0.5;
export const MAX_SUGGESTIONS = 3;

export interface RosterUser {
    id: number;
    name: string;
    email: string;
    merittoUserId: number | null;
    roleName: string;
    teamId: number | null;
    teamName: string | null;
    agencyId: number | null;
    agencyName: string | null;
    isActive: boolean;
}

/** One `counsellor_perf_monthly` row for the month being imported. */
export interface ExistingEntry {
    overall: number | null;
    nonNegotiable: number | null;
    achieved: number | null;
    achievedSource: AchievedSource;
    importId: number | null;
    teamId: number;
    agencyId: number | null;
}

export interface ImportContext {
    date: string;
    teams: { id: number; name: string }[];
    agencies: { id: number; name: string }[];
    /** Every user, every role, active or not — a promoted counsellor can still appear in a sheet. */
    roster: RosterUser[];
    /** Existing monthly rows for `date`, by user id. */
    entries: Record<number, ExistingEntry>;
    /** COUNT(*) of `admissions` in `date`, by user id (absent = 0). */
    liveAchieved: Record<number, number>;
}

export type TeamResolution =
    | { kind: "matched"; teamId: number }
    | { kind: "unmatched"; suggestions: { teamId: number; score: number }[] };

export type AgencyResolution =
    | { kind: "none" }
    | { kind: "matched"; agencyId: number }
    | { kind: "unmatched"; suggestions: { agencyId: number; score: number }[] };

export type MatchVia = "email" | "name" | "fuzzy";

export interface UserCandidate {
    userId: number;
    score: number;
    sameTeam: boolean;
}

export type UserMatch =
    /** Taken without asking; `candidates` still lists the runners-up for the dropdown. */
    | { kind: "auto"; userId: number; via: MatchVia; candidates: UserCandidate[] }
    /** Needs confirmation. `likely` means `candidates[0]` is close enough to prefill as the pick. */
    | { kind: "suggest"; likely: boolean; candidates: UserCandidate[] }
    /** Several rows or several users claim the same match; the operator must choose. */
    | { kind: "ambiguous"; candidates: UserCandidate[]; reason: string }
    | { kind: "none"; candidates: UserCandidate[] };

export interface PlanRow {
    rowId: string;
    input: ImportRowInput;
    team: TeamResolution;
    agency: AgencyResolution;
    match: UserMatch;
}

export interface ImportPlan {
    context: ImportContext;
    rows: PlanRow[];
    /** Sheet team name → resolution, for the mapping panel (rows carry the same value). */
    teamMap: Record<string, TeamResolution>;
    /** Sheet agency text → resolution. */
    agencyMap: Record<string, AgencyResolution>;
}

export function resolveTeam(name: string, teams: ImportContext["teams"]): TeamResolution {
    const wanted = normalizeText(name);
    const exact = teams.find((team) => normalizeText(team.name) === wanted);
    if (exact) return { kind: "matched", teamId: exact.id };
    const match = matchTeamSheetName(
        name,
        teams.map((team) => team.name),
    );
    if (match.matched) {
        const team = teams.find((candidate) => candidate.name === match.team);
        if (team) return { kind: "matched", teamId: team.id };
    }
    const suggestions = rankCandidates(name, teams, (team) => team.name, SUGGEST_THRESHOLD)
        .slice(0, MAX_SUGGESTIONS)
        .map(({ candidate, score }) => ({ teamId: candidate.id, score }));
    return { kind: "unmatched", suggestions };
}

export function resolveAgency(name: string | null, agencies: ImportContext["agencies"]): AgencyResolution {
    if (name === null) return { kind: "none" };
    const wanted = normalizeText(name);
    const exact = agencies.find((agency) => normalizeText(agency.name) === wanted);
    if (exact) return { kind: "matched", agencyId: exact.id };
    const suggestions = rankCandidates(name, agencies, (agency) => agency.name, SUGGEST_THRESHOLD)
        .slice(0, MAX_SUGGESTIONS)
        .map(({ candidate, score }) => ({ agencyId: candidate.id, score }));
    return { kind: "unmatched", suggestions };
}

/**
 * Match one sheet row to a roster user. Email is decisive when present. A
 * unique exact name (case/punctuation-insensitive) is taken as-is; a unique
 * near-identical name is taken only when it is also on the same team; any
 * other plausible candidate is a suggestion the operator confirms.
 */
export function matchUser(input: ImportRowInput, sheetTeamId: number | null, roster: readonly RosterUser[]): UserMatch {
    if (input.email !== null) {
        const wanted = input.email.trim().toLowerCase();
        const byEmail = roster.find((user) => user.email === wanted);
        if (byEmail) {
            return {
                kind: "auto",
                userId: byEmail.id,
                via: "email",
                candidates: [{ userId: byEmail.id, score: 1, sameTeam: byEmail.teamId === sheetTeamId }],
            };
        }
    }

    const ranked = rankCandidates(input.name, roster, (user) => user.name, SUGGEST_THRESHOLD).map(
        ({ candidate, score }): UserCandidate => ({
            userId: candidate.id,
            score,
            sameTeam: sheetTeamId !== null && candidate.teamId === sheetTeamId,
        }),
    );
    // Same score: same-team first, then active before inactive.
    const activeById = new Map(roster.map((user) => [user.id, user.isActive]));
    ranked.sort(
        (a, b) =>
            b.score - a.score ||
            Number(b.sameTeam) - Number(a.sameTeam) ||
            Number(activeById.get(b.userId) ?? false) - Number(activeById.get(a.userId) ?? false),
    );
    const candidates = ranked.slice(0, MAX_SUGGESTIONS);
    const best = candidates[0];
    if (!best) return { kind: "none", candidates: [] };

    const exact = ranked.filter((candidate) => candidate.score === 1);
    if (exact.length === 1) return { kind: "auto", userId: best.userId, via: "name", candidates };
    if (exact.length > 1) {
        const sameTeam = exact.filter((candidate) => candidate.sameTeam);
        if (sameTeam.length === 1 && sameTeam[0]) {
            return { kind: "auto", userId: sameTeam[0].userId, via: "name", candidates };
        }
        return { kind: "ambiguous", candidates, reason: "Several users have exactly this name." };
    }

    const strong = ranked.filter((candidate) => candidate.score >= AUTO_THRESHOLD);
    if (strong.length === 1 && best.sameTeam) return { kind: "auto", userId: best.userId, via: "fuzzy", candidates };
    return { kind: "suggest", likely: best.score >= LIKELY_THRESHOLD, candidates };
}

/** Build the plan for every row. Rows that auto-match the same user are demoted to ambiguous. */
export function buildImportPlan(rows: readonly ImportRowInput[], context: ImportContext): ImportPlan {
    const teamMap: Record<string, TeamResolution> = {};
    const agencyMap: Record<string, AgencyResolution> = {};
    for (const row of rows) {
        teamMap[row.team] ??= resolveTeam(row.team, context.teams);
        if (row.agency !== null) agencyMap[row.agency] ??= resolveAgency(row.agency, context.agencies);
    }

    const planRows: PlanRow[] = rows.map((input) => {
        const team = teamMap[input.team] ?? resolveTeam(input.team, context.teams);
        const agency = input.agency === null ? { kind: "none" as const } : (agencyMap[input.agency] ?? { kind: "none" as const });
        const sheetTeamId = team.kind === "matched" ? team.teamId : null;
        return { rowId: input.rowId, input, team, agency, match: matchUser(input, sheetTeamId, context.roster) };
    });

    const claims = new Map<number, PlanRow[]>();
    for (const row of planRows) {
        if (row.match.kind !== "auto") continue;
        const list = claims.get(row.match.userId) ?? [];
        list.push(row);
        claims.set(row.match.userId, list);
    }
    for (const [, claimants] of claims) {
        if (claimants.length < 2) continue;
        for (const row of claimants) {
            const others = claimants
                .filter((other) => other !== row)
                .map((other) => `${other.input.sheet} row ${String(other.input.row)}`)
                .join(", ");
            row.match = {
                kind: "ambiguous",
                candidates: row.match.candidates,
                reason: `Also matched by ${others}.`,
            };
        }
    }

    return { context, rows: planRows, teamMap, agencyMap };
}
