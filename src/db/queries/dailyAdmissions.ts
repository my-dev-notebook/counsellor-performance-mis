import { eq, and, like, asc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { admissions, users } from "@/db/schema";
import type { BatchItem } from "drizzle-orm/batch";
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
 * row has to actually disappear. An empty `records` array is therefore a valid
 * input — it just clears the day. See `replaceDailyAdmissions` for the rest.
 */
export async function upsertDailyAdmission(userId: number, date: string, records: AdmissionRecord[]): Promise<void> {
    await replaceDailyAdmissions(userId, [{ date, records }]);
}

/**
 * Replace one counsellor's admissions for several days at once — the
 * auto-fetch apply path, where a whole month can land in one call.
 *
 * All the given days are deleted FIRST, then every row inserted, rather than
 * day by day: `application_number` is globally unique, so an application
 * that moved from day A to day B would otherwise trip the constraint when B
 * is written before A is cleared.
 *
 * The delete and the inserts go in one `db.batch`, which D1 runs as a single
 * transaction, so a failed insert (e.g. the unique constraint below) rolls the
 * delete back too. Inserts are chunked because D1 allows at most 100 bound
 * parameters per statement.
 *
 * `team_id`/`agency_id` are snapshotted from the user's current assignment for
 * NEW application numbers; an application that was already on one of these
 * days keeps the snapshot it had, so re-saving after a team change does not
 * rewrite which team the earlier admissions counted for.
 *
 * Re-crediting an admission that already belongs to another counsellor (or to
 * a day outside `days`) raises the unique-constraint error rather than
 * silently double-counting. That's the point of the constraint; callers should
 * surface the failure, not swallow it — or check `findAdmissionOwners` first.
 *
 * `reclaim` is the exception: application numbers the caller has already
 * shown as moving here from another counsellor (the all-counsellors fetch).
 * Those rows are deleted wherever they sit before the inserts, in the same
 * batch, so the move is one transaction.
 */
export async function replaceDailyAdmissions(
    userId: number,
    days: { date: string; records: AdmissionRecord[] }[],
    reclaim: string[] = [],
): Promise<void> {
    if (days.length === 0) return;
    const db = await getDb();
    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");
    if (user.teamId === null) throw new Error("User has no team; cannot record admissions");

    const dates = days.map((d) => d.date);
    const existing = await db
        .select({ applicationNumber: admissions.applicationNumber, teamId: admissions.teamId, agencyId: admissions.agencyId })
        .from(admissions)
        .where(and(eq(admissions.userId, userId), inArray(admissions.date, dates)));
    const previousSnapshot = new Map(existing.map((r) => [r.applicationNumber, r]));

    const currentTeamId = user.teamId;
    const values = days.flatMap((day) =>
        day.records.map((r) => {
            const previous = previousSnapshot.get(r.applicationNumber);
            return {
                userId,
                teamId: previous?.teamId ?? currentTeamId,
                agencyId: previous ? previous.agencyId : user.agencyId,
                date: day.date,
                ...r,
            };
        }),
    );

    const statements: BatchItem<"sqlite">[] = [
        db.delete(admissions).where(and(eq(admissions.userId, userId), inArray(admissions.date, dates))),
    ];
    for (let i = 0; i < reclaim.length; i += RECLAIM_CHUNK) {
        statements.push(db.delete(admissions).where(inArray(admissions.applicationNumber, reclaim.slice(i, i + RECLAIM_CHUNK))));
    }
    for (let i = 0; i < values.length; i += INSERT_CHUNK) {
        statements.push(db.insert(admissions).values(values.slice(i, i + INSERT_CHUNK)));
    }
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);
}

/** 9 bound values per admission row; 10 rows stays under D1's 100-parameter limit. */
const INSERT_CHUNK = 10;
/** One bound value per application number in a reclaim delete. */
const RECLAIM_CHUNK = 90;

/**
 * Every admission of one "YYYY-MM" month across ALL users, with the owner's
 * name. The all-counsellors fetch diffs in-scope counsellors against this
 * and uses the rest to spot rows already credited to someone it can't touch.
 */
export async function getAdmissionsForMonth(monthDate: string): Promise<(AdmissionRow & { userName: string })[]> {
    const db = await getDb();
    return db
        .select({ ...COLUMNS, userName: users.name })
        .from(admissions)
        .innerJoin(users, eq(users.id, admissions.userId))
        .where(like(admissions.date, `${monthDate}-%`))
        .orderBy(asc(admissions.date), asc(admissions.id));
}

/** Where an application number is currently recorded — who it's credited to and on which day. */
export interface AdmissionOwner {
    applicationNumber: string;
    userId: number;
    userName: string;
    date: string;
}

/**
 * Current owners of the given application numbers, across every counsellor.
 * Lets the auto-fetch diff flag rows that `replaceDailyAdmissions` would
 * reject (already credited elsewhere) before anything is written.
 */
export async function findAdmissionOwners(applicationNumbers: string[]): Promise<AdmissionOwner[]> {
    if (applicationNumbers.length === 0) return [];
    const db = await getDb();
    return db
        .select({
            applicationNumber: admissions.applicationNumber,
            userId: admissions.userId,
            userName: users.name,
            date: admissions.date,
        })
        .from(admissions)
        .innerJoin(users, eq(users.id, admissions.userId))
        .where(inArray(admissions.applicationNumber, applicationNumbers));
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
