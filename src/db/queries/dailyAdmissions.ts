import { eq, and, like, asc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { admissions } from "@/db/schema";
import type { AdmissionRecord, AdmissionRow } from "@/db/types";
import { getUserById } from "@/db/queries/users";

const COLUMNS = {
    id: admissions.id,
    userId: admissions.userId,
    teamId: admissions.teamId,
    agencyId: admissions.agencyId,
    date: admissions.date,
    applicationNumber: admissions.applicationNumber,
    applicantUserId: admissions.applicantUserId,
    applicantName: admissions.applicantName,
    formId: admissions.formId,
    formName: admissions.formName,
};

/**
 * Replace one counsellor's admissions for one day.
 *
 * Delete-then-insert, because the grid submits the day as a whole and a removed
 * row has to actually disappear. D1 has no interactive transactions, so this is
 * NOT atomic: a failure between the two statements leaves the day empty and the
 * user has to save again. An empty `records` array is therefore a valid input —
 * it just clears the day.
 *
 * `team_id`/`agency_id` are snapshotted from the user's current assignment for
 * NEW application numbers; an application that was already on this day keeps
 * the snapshot it had, so re-saving a day after a team change does not rewrite
 * which team the earlier admissions counted for.
 *
 * `application_number` is globally unique, so re-crediting an admission that
 * already belongs to another counsellor/day raises a constraint error rather
 * than silently double-counting. That's the point of the constraint; callers
 * should surface the failure, not swallow it.
 */
export async function upsertDailyAdmission(userId: number, date: string, records: AdmissionRecord[]): Promise<void> {
    const db = await getDb();
    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");
    if (user.teamId === null) throw new Error("User has no team; cannot record admissions");

    const existing = await db
        .select({ applicationNumber: admissions.applicationNumber, teamId: admissions.teamId, agencyId: admissions.agencyId })
        .from(admissions)
        .where(and(eq(admissions.userId, userId), eq(admissions.date, date)));
    const previousSnapshot = new Map(existing.map((r) => [r.applicationNumber, r]));

    await db.delete(admissions).where(and(eq(admissions.userId, userId), eq(admissions.date, date)));
    if (records.length === 0) return;

    const currentTeamId = user.teamId;
    await db.insert(admissions).values(
        records.map((r) => {
            const previous = previousSnapshot.get(r.applicationNumber);
            return {
                userId,
                teamId: previous?.teamId ?? currentTeamId,
                agencyId: previous ? previous.agencyId : user.agencyId,
                date,
                ...r,
            };
        }),
    );
}

/** Every admission for one user in one "YYYY-MM" month — feeds the calendar-grid UI. */
export async function getDailyAdmissionsForMonth(userId: number, monthDate: string): Promise<AdmissionRow[]> {
    const db = await getDb();
    return db
        .select(COLUMNS)
        .from(admissions)
        .where(and(eq(admissions.userId, userId), like(admissions.date, `${monthDate}-%`)))
        .orderBy(asc(admissions.date), asc(admissions.id));
}

/** One month's admission total for one user — used by prefill/fallback paths. */
export async function sumDailyForMonth(userId: number, monthDate: string): Promise<number> {
    const db = await getDb();
    const rows = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(admissions)
        .where(and(eq(admissions.userId, userId), like(admissions.date, `${monthDate}-%`)));
    return Number(rows[0]?.total ?? 0);
}
