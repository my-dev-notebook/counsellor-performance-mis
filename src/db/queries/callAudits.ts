import { and, desc, eq, gte, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import { callAudits, teams, users } from "@/db/schema";
import { PARAMETER_KEYS } from "@/schemas/call-audit";
import type { CallAuditInput, ParameterKey, Rating } from "@/schemas/call-audit";
import type { Scope } from "@/lib/auth/permissions";
import { combine, scopeRowCondition } from "@/lib/auth/permissions";

const auditor = alias(users, "auditor");

/** One `call_audits` row with the counsellor, team and auditor names joined in. */
export interface CallAuditRow {
    id: number;
    userId: number;
    counsellorName: string;
    teamId: number;
    teamName: string;
    auditedBy: number;
    auditorName: string;
    callAt: string;
    durationSeconds: number;
    phone: string;
    applicationId: string | null;
    periodStart: string;
    periodEnd: string;
    ratings: Record<ParameterKey, Rating>;
    reasons: Record<ParameterKey, string>;
    overallRating: (typeof callAudits.$inferSelect)["overallRating"];
    feedback: string;
    createdAt: string;
    updatedAt: string;
}

/** `rating_<key>` / `reason_<key>` columns keyed by parameter, so nothing below spells the eight out. */
const RATING_COLUMNS = {
    opening: callAudits.ratingOpening,
    language: callAudits.ratingLanguage,
    listening: callAudits.ratingListening,
    politeness: callAudits.ratingPoliteness,
    information: callAudits.ratingInformation,
    usp: callAudits.ratingUsp,
    closure: callAudits.ratingClosure,
    conversion: callAudits.ratingConversion,
} satisfies Record<ParameterKey, unknown>;

/** Reasons are selected under `reason_<key>` so they cannot collide with the rating aliases above. */
const REASON_COLUMNS = {
    reason_opening: callAudits.reasonOpening,
    reason_language: callAudits.reasonLanguage,
    reason_listening: callAudits.reasonListening,
    reason_politeness: callAudits.reasonPoliteness,
    reason_information: callAudits.reasonInformation,
    reason_usp: callAudits.reasonUsp,
    reason_closure: callAudits.reasonClosure,
    reason_conversion: callAudits.reasonConversion,
} satisfies Record<`reason_${ParameterKey}`, unknown>;

/** Drizzle's insert/update shape for the eight rating and eight reason columns. */
type ParameterColumns = Pick<
    typeof callAudits.$inferInsert,
    | "ratingOpening"
    | "ratingLanguage"
    | "ratingListening"
    | "ratingPoliteness"
    | "ratingInformation"
    | "ratingUsp"
    | "ratingClosure"
    | "ratingConversion"
    | "reasonOpening"
    | "reasonLanguage"
    | "reasonListening"
    | "reasonPoliteness"
    | "reasonInformation"
    | "reasonUsp"
    | "reasonClosure"
    | "reasonConversion"
>;

const COLUMNS = {
    id: callAudits.id,
    userId: callAudits.userId,
    counsellorName: users.name,
    teamId: callAudits.teamId,
    teamName: teams.name,
    auditedBy: callAudits.auditedBy,
    auditorName: auditor.name,
    callAt: callAudits.callAt,
    durationSeconds: callAudits.durationSeconds,
    phone: callAudits.phone,
    applicationId: callAudits.applicationId,
    periodStart: callAudits.periodStart,
    periodEnd: callAudits.periodEnd,
    ...RATING_COLUMNS,
    ...REASON_COLUMNS,
    overallRating: callAudits.overallRating,
    feedback: callAudits.feedback,
    createdAt: callAudits.createdAt,
    updatedAt: callAudits.updatedAt,
};

type Raw = Awaited<ReturnType<typeof baseQuery>>[number];

/** Folds the eight rating / reason columns (selected as `<key>` / `reason_<key>`) into records keyed by parameter. */
function toRow(r: Raw): CallAuditRow {
    const ratings = {} as Record<ParameterKey, Rating>;
    const reasons = {} as Record<ParameterKey, string>;
    for (const key of PARAMETER_KEYS) {
        ratings[key] = r[key];
        reasons[key] = r[`reason_${key}`] ?? "";
    }
    return {
        id: r.id,
        userId: r.userId,
        counsellorName: r.counsellorName,
        teamId: r.teamId,
        teamName: r.teamName,
        auditedBy: r.auditedBy,
        auditorName: r.auditorName,
        callAt: r.callAt,
        durationSeconds: r.durationSeconds,
        phone: r.phone,
        applicationId: r.applicationId,
        periodStart: r.periodStart,
        periodEnd: r.periodEnd,
        ratings,
        reasons,
        overallRating: r.overallRating,
        feedback: r.feedback,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}

/** The write shape: `CallAuditInput`'s nested scores flattened onto the table's columns. */
function toColumns(input: CallAuditInput, teamId: number, auditedBy: number) {
    const s = input.scores;
    const parameters: ParameterColumns = {
        ratingOpening: s.opening.rating,
        ratingLanguage: s.language.rating,
        ratingListening: s.listening.rating,
        ratingPoliteness: s.politeness.rating,
        ratingInformation: s.information.rating,
        ratingUsp: s.usp.rating,
        ratingClosure: s.closure.rating,
        ratingConversion: s.conversion.rating,
        reasonOpening: reason(s.opening.reason),
        reasonLanguage: reason(s.language.reason),
        reasonListening: reason(s.listening.reason),
        reasonPoliteness: reason(s.politeness.reason),
        reasonInformation: reason(s.information.reason),
        reasonUsp: reason(s.usp.reason),
        reasonClosure: reason(s.closure.reason),
        reasonConversion: reason(s.conversion.reason),
    };
    return {
        userId: input.userId,
        teamId,
        auditedBy,
        callAt: input.callAt,
        durationSeconds: input.durationSeconds,
        phone: input.phone,
        applicationId: input.applicationId === "" ? null : input.applicationId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        ...parameters,
        overallRating: input.overallRating,
        feedback: input.feedback,
    };
}

function reason(text: string): string | null {
    return text === "" ? null : text;
}

function baseQuery(db: Awaited<ReturnType<typeof getDb>>) {
    return db
        .select(COLUMNS)
        .from(callAudits)
        .innerJoin(users, eq(callAudits.userId, users.id))
        .innerJoin(teams, eq(callAudits.teamId, teams.id))
        .innerJoin(auditor, eq(callAudits.auditedBy, auditor.id));
}

export interface CallAuditFilter {
    userId?: number;
    teamId?: number;
    /** Inclusive "YYYY-MM-DD" bounds on the call's date. */
    from?: string;
    to?: string;
}

/** Audits visible to `scope` (filtered on the snapshot team), newest call first. */
export async function listCallAudits(scope: Scope, filter: CallAuditFilter = {}): Promise<CallAuditRow[]> {
    const db = await getDb();
    const rows = await baseQuery(db)
        .where(
            combine(
                scopeRowCondition(scope, callAudits.userId, callAudits.teamId),
                filter.userId === undefined ? undefined : eq(callAudits.userId, filter.userId),
                filter.teamId === undefined ? undefined : eq(callAudits.teamId, filter.teamId),
                filter.from === undefined ? undefined : gte(callAudits.callAt, filter.from),
                filter.to === undefined ? undefined : lte(callAudits.callAt, `${filter.to} 23:59`),
            ),
        )
        .orderBy(desc(callAudits.callAt), desc(callAudits.id));
    return rows.map(toRow);
}

export async function getCallAudit(scope: Scope, id: number): Promise<CallAuditRow | null> {
    const db = await getDb();
    const rows = await baseQuery(db).where(
        and(eq(callAudits.id, id), scopeRowCondition(scope, callAudits.userId, callAudits.teamId)),
    );
    const row = rows[0];
    return row ? toRow(row) : null;
}

/** `teamId` is the counsellor's team at audit time; the caller resolves it from the user row. */
export async function createCallAudit(input: CallAuditInput, teamId: number, auditedBy: number): Promise<number> {
    const db = await getDb();
    const inserted = await db
        .insert(callAudits)
        .values(toColumns(input, teamId, auditedBy))
        .returning({ id: callAudits.id });
    const id = inserted[0]?.id;
    if (id === undefined) throw new Error("Insert returned no id");
    return id;
}

/** Overwrites every field except who first audited it. Any quality analyst may edit any audit. */
export async function updateCallAudit(id: number, input: CallAuditInput, teamId: number): Promise<void> {
    const db = await getDb();
    const columns: Partial<ReturnType<typeof toColumns>> = toColumns(input, teamId, 0);
    delete columns.auditedBy;
    await db
        .update(callAudits)
        .set({ ...columns, updatedAt: new Date().toISOString() })
        .where(eq(callAudits.id, id));
}

export async function deleteCallAudit(id: number): Promise<void> {
    const db = await getDb();
    await db.delete(callAudits).where(eq(callAudits.id, id));
}
