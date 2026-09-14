import type { AgencyChoice, CommitImportInput, CommitRowInput, ExpectedEntry } from "@/schemas/import";
import { assessRow } from "@/lib/import/assess";
import type { Flag, RowAssessment } from "@/lib/import/assess";
import type { ImportPlan, PlanRow, RosterUser } from "@/lib/import/plan";

/**
 * The review screen's state model: the plan is immutable, the operator's
 * choices live in `ReviewChoices`, and everything shown (row status, what
 * will be written, whether Commit is allowed) is derived from the two by
 * `deriveRows`. Pure, so the screen re-derives on every change.
 */

export type Decision =
    /** Ambiguous match, nothing chosen yet. */
    | { kind: "unresolved" }
    | { kind: "skip" }
    | {
          kind: "match";
          userId: number;
          /** A suggested (not auto) match must be confirmed before it counts. */
          confirmed: boolean;
          /** For a row that differs from the DB: which side wins. `null` = not decided yet. */
          take: "sheet" | "keep" | null;
          /** With `take: "sheet"`, also rewrite an existing row's team/agency snapshot. */
          rewriteSnapshot: boolean;
          /** Also move the user's roster team/agency to the sheet's. */
          updateRoster: boolean;
      }
    | { kind: "create"; email: string };

/** Counsellor login email convention: "Romeo Sarkar" -> "c-romeo.sarkar@bennett.edu.in". */
export function defaultCounsellorEmail(name: string): string {
    const slug = name
        .normalize("NFKD")
        .replace(/[^\x00-\x7F]/g, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .join(".");
    return slug ? `c-${slug}@bennett.edu.in` : "";
}

export interface ReviewChoices {
    /** Sheet team name → DB team id, for teams the plan could not match. */
    teamChoices: Record<string, number>;
    /** Sheet agency text → choice, for agencies the plan could not match. */
    agencyChoices: Record<string, AgencyChoice>;
    decisions: Record<string, Decision>;
}

export type RowStatus =
    | "team-unmapped"
    | "agency-unmapped"
    | "unresolved"
    | "confirm"
    | "conflict"
    | "invalid"
    | "insert"
    | "update"
    | "no-change"
    | "create"
    | "skip";

/** Statuses that block Commit. */
export const ATTENTION_STATUSES: ReadonlySet<RowStatus> = new Set([
    "team-unmapped",
    "agency-unmapped",
    "unresolved",
    "confirm",
    "conflict",
    "invalid",
]);

export interface RowView {
    row: PlanRow;
    decision: Decision;
    teamId: number | null;
    agency: AgencyChoice | "unresolved";
    user: RosterUser | null;
    assessment: RowAssessment | null;
    status: RowStatus;
    needsAttention: boolean;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MATCH_DEFAULTS = { take: null, rewriteSnapshot: false, updateRoster: false } as const;

export function defaultDecision(row: PlanRow): Decision {
    const match = row.match;
    switch (match.kind) {
        case "auto":
            return { kind: "match", userId: match.userId, confirmed: true, ...MATCH_DEFAULTS };
        case "suggest": {
            const top = match.candidates[0];
            if (match.likely && top) return { kind: "match", userId: top.userId, confirmed: false, ...MATCH_DEFAULTS };
            return { kind: "create", email: row.input.email ?? "" };
        }
        case "none":
            return { kind: "create", email: row.input.email ?? "" };
        case "ambiguous":
            return { kind: "unresolved" };
    }
}

export function defaultChoices(plan: ImportPlan): ReviewChoices {
    const decisions: Record<string, Decision> = {};
    for (const row of plan.rows) decisions[row.rowId] = defaultDecision(row);
    return { teamChoices: {}, agencyChoices: {}, decisions };
}

/** Keep the operator's decisions across a re-plan; rows new to the plan get defaults. */
export function mergeChoices(previous: ReviewChoices, plan: ImportPlan): ReviewChoices {
    const decisions: Record<string, Decision> = {};
    for (const row of plan.rows) decisions[row.rowId] = previous.decisions[row.rowId] ?? defaultDecision(row);
    return { ...previous, decisions };
}

export function resolvedTeamId(row: PlanRow, choices: ReviewChoices): number | null {
    if (row.team.kind === "matched") return row.team.teamId;
    return choices.teamChoices[row.input.team] ?? null;
}

export function resolvedAgency(row: PlanRow, choices: ReviewChoices): AgencyChoice | "unresolved" {
    if (row.agency.kind === "none") return null;
    if (row.agency.kind === "matched") return { kind: "existing", id: row.agency.agencyId };
    const chosen = row.input.agency === null ? undefined : choices.agencyChoices[row.input.agency];
    return chosen === undefined ? "unresolved" : chosen;
}

/**
 * The agency id to assess against. An agency that is about to be created has
 * no id yet; -1 never matches a user's agency, which is exactly the point —
 * the row is filed under a new agency, so it differs from whatever the user has.
 */
function agencyIdForAssessment(agency: AgencyChoice): number | null {
    if (agency === null) return null;
    return agency.kind === "existing" ? agency.id : -1;
}

export function deriveRow(row: PlanRow, plan: ImportPlan, choices: ReviewChoices): RowView {
    const decision = choices.decisions[row.rowId] ?? defaultDecision(row);
    const teamId = resolvedTeamId(row, choices);
    const agency = resolvedAgency(row, choices);
    const base = { row, decision, teamId, agency, user: null, assessment: null };
    const finish = (status: RowStatus, extra: Partial<RowView> = {}): RowView => ({
        ...base,
        ...extra,
        status,
        needsAttention: ATTENTION_STATUSES.has(status),
    });

    if (decision.kind === "skip") return finish("skip");
    if (teamId === null) return finish("team-unmapped");
    if (agency === "unresolved") return finish("agency-unmapped");
    if (decision.kind === "unresolved") return finish("unresolved");
    if (decision.kind === "create") return finish(EMAIL_RE.test(decision.email.trim()) ? "create" : "invalid");

    const user = plan.context.roster.find((candidate) => candidate.id === decision.userId) ?? null;
    if (!user) return finish("unresolved");
    const assessment = assessRow(row.input, user, teamId, agencyIdForAssessment(agency), plan.context);
    const extra = { user, assessment };
    if (!decision.confirmed) return finish("confirm", extra);
    if (assessment.existing === null) return finish("insert", extra);
    if (assessment.identical) return finish("no-change", extra);
    if (decision.take === null) return finish("conflict", extra);
    return finish(decision.take === "sheet" ? "update" : "no-change", extra);
}

export function deriveRows(plan: ImportPlan, choices: ReviewChoices): RowView[] {
    return plan.rows.map((row) => deriveRow(row, plan, choices));
}

export function countByStatus(views: readonly RowView[]): Record<RowStatus, number> {
    const counts: Record<RowStatus, number> = {
        "team-unmapped": 0,
        "agency-unmapped": 0,
        unresolved: 0,
        confirm: 0,
        conflict: 0,
        invalid: 0,
        insert: 0,
        update: 0,
        "no-change": 0,
        create: 0,
        skip: 0,
    };
    for (const view of views) counts[view.status] += 1;
    return counts;
}

export function isCommittable(views: readonly RowView[]): boolean {
    return views.length > 0 && views.every((view) => !view.needsAttention);
}

function toExpected(assessment: RowAssessment): ExpectedEntry {
    const existing = assessment.existing;
    if (existing === null) return null;
    return {
        overall: existing.overall,
        nonNegotiable: existing.nonNegotiable,
        achieved: existing.achieved,
        achievedSource: existing.achievedSource,
        teamId: existing.teamId,
        agencyId: existing.agencyId,
    };
}

function rowLabel(view: RowView): string {
    return `${view.row.input.sheet} row ${String(view.row.input.row)} (${view.row.input.name})`;
}

/** Flags worth recording on the import for a row that is actually being written. */
function notesFor(view: RowView, commit: CommitRowInput): string[] {
    if (commit.action !== "upsert" || !view.assessment) return [];
    const relevant = (flag: Flag): boolean => {
        switch (flag.code) {
            case "NAME_DIFFERS":
            case "EMAIL_DIFFERS":
            case "USER_INACTIVE":
                return true;
            case "SNAPSHOT_TEAM_DIFFERS":
            case "SNAPSHOT_AGENCY_DIFFERS":
                return commit.rewriteSnapshot;
            case "ROSTER_TEAM_DIFFERS":
            case "ROSTER_AGENCY_DIFFERS":
                return commit.updateRoster;
            case "ACHIEVED_VS_LIVE":
                return commit.writeAchieved;
            case "NO_MERITTO_ID":
                return false;
        }
    };
    return view.assessment.flags.filter(relevant).map((flag) => `${rowLabel(view)}: ${flag.message}`);
}

/** Only call once `isCommittable` is true; rows that need attention are sent as skips defensively. */
export function buildCommit(views: readonly RowView[], date: string, sourceFileName: string): CommitImportInput {
    const rows: CommitRowInput[] = [];
    const notes: string[] = [];
    for (const view of views) {
        const { decision, teamId, agency, assessment } = view;
        const skip: CommitRowInput = { action: "skip", rowId: view.row.rowId };
        if (view.needsAttention || teamId === null || agency === "unresolved" || decision.kind === "skip") {
            rows.push(skip);
            continue;
        }
        if (decision.kind === "create") {
            rows.push({
                action: "create",
                rowId: view.row.rowId,
                name: view.row.input.name,
                email: decision.email.trim().toLowerCase(),
                teamId,
                agency,
                overall: roundOrNull(view.row.input.target),
                nonNegotiable: roundOrNull(view.row.input.nonNegotiable),
                achieved: roundOrNull(view.row.input.achieved),
            });
            continue;
        }
        if (decision.kind !== "match" || !assessment) {
            rows.push(skip);
            continue;
        }
        const isNew = assessment.existing === null;
        const takeSheet = decision.take === "sheet";
        const commit: Extract<CommitRowInput, { action: "upsert" }> = {
            action: "upsert",
            rowId: view.row.rowId,
            userId: decision.userId,
            teamId,
            agency,
            overall: assessment.sheet.overall,
            nonNegotiable: assessment.sheet.nonNegotiable,
            achieved: assessment.sheet.achieved,
            writeTargets: isNew || (takeSheet && assessment.differs.targets),
            writeAchieved: isNew ? assessment.sheet.achieved !== null : takeSheet && assessment.differs.achieved,
            rewriteSnapshot: !isNew && takeSheet && assessment.differs.snapshot && decision.rewriteSnapshot,
            updateRoster: decision.updateRoster,
            expected: toExpected(assessment),
        };
        const writesSomething =
            isNew || commit.writeTargets || commit.writeAchieved || commit.rewriteSnapshot || commit.updateRoster;
        if (!writesSomething) {
            rows.push(skip);
            continue;
        }
        rows.push(commit);
        notes.push(...notesFor(view, commit));
    }
    return { date, sourceFileName, rows, notes };
}

function roundOrNull(value: number | null): number | null {
    return value === null ? null : Math.round(value);
}
