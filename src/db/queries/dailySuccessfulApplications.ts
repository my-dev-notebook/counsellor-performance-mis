import { eq, and, like, asc, gte, lte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { successfulApplications, users } from "@/db/schema";
import type { BatchItem } from "drizzle-orm/batch";
import type { SuccessfulApplicationRecord, SuccessfulApplicationRow } from "@/db/types";
import { getUserById } from "@/db/queries/users";
import { sessionMonths } from "@/schemas/dates";

const COLUMNS = {
    id: successfulApplications.id,
    userId: successfulApplications.userId,
    teamId: successfulApplications.teamId,
    agencyId: successfulApplications.agencyId,
    date: successfulApplications.date,
    applicationNumber: successfulApplications.applicationNumber,
    applicantUserId: successfulApplications.applicantUserId,
    applicantName: successfulApplications.applicantName,
    formId: successfulApplications.formId,
    formName: successfulApplications.formName,
};

/**
 * Replace one counsellor's successful applications for one day.
 *
 * Delete-then-insert, because the grid submits the day as a whole and a removed
 * row has to actually disappear. An empty `records` array is therefore a valid
 * input — it just clears the day. See `replaceDailySuccessfulApplications` for the rest.
 */
export async function upsertDailySuccessfulApplication(userId: number, date: string, records: SuccessfulApplicationRecord[]): Promise<void> {
    await replaceDailySuccessfulApplications(userId, [{ date, records }]);
}

/**
 * Replace one counsellor's successful applications for several days at once — the
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
 * rewrite which team the earlier successful applications counted for.
 *
 * Re-crediting a successful application that already belongs to another counsellor (or to
 * a day outside `days`) raises the unique-constraint error rather than
 * silently double-counting. That's the point of the constraint; callers should
 * surface the failure, not swallow it — or check `findSuccessfulApplicationOwners` first.
 *
 * `reclaim` is the exception: application numbers the caller has already
 * shown as moving here from another counsellor (the all-counsellors fetch).
 * Those rows are deleted wherever they sit before the inserts, in the same
 * batch, so the move is one transaction.
 */
export async function replaceDailySuccessfulApplications(
    userId: number,
    days: { date: string; records: SuccessfulApplicationRecord[] }[],
    reclaim: string[] = [],
): Promise<void> {
    if (days.length === 0) return;
    const db = await getDb();
    const user = await getUserById(userId);
    if (!user) throw new Error("User not found");
    if (user.teamId === null) throw new Error("User has no team; cannot record successful applications");

    const dates = days.map((d) => d.date);
    const existing = await db
        .select({ applicationNumber: successfulApplications.applicationNumber, teamId: successfulApplications.teamId, agencyId: successfulApplications.agencyId })
        .from(successfulApplications)
        .where(and(eq(successfulApplications.userId, userId), inArray(successfulApplications.date, dates)));
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
        db.delete(successfulApplications).where(and(eq(successfulApplications.userId, userId), inArray(successfulApplications.date, dates))),
    ];
    for (let i = 0; i < reclaim.length; i += RECLAIM_CHUNK) {
        statements.push(db.delete(successfulApplications).where(inArray(successfulApplications.applicationNumber, reclaim.slice(i, i + RECLAIM_CHUNK))));
    }
    for (let i = 0; i < values.length; i += INSERT_CHUNK) {
        statements.push(db.insert(successfulApplications).values(values.slice(i, i + INSERT_CHUNK)));
    }
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);
}

/** 9 bound values per successful application row; 10 rows stays under D1's 100-parameter limit. */
const INSERT_CHUNK = 10;
/** One bound value per application number in a reclaim delete. */
const RECLAIM_CHUNK = 90;

/**
 * Every successful application of one "YYYY-MM" month across ALL users, with the owner's
 * name. The all-counsellors fetch diffs in-scope counsellors against this
 * and uses the rest to spot rows already credited to someone it can't touch.
 */
export async function getSuccessfulApplicationsForMonth(monthDate: string): Promise<(SuccessfulApplicationRow & { userName: string })[]> {
    const db = await getDb();
    return db
        .select({ ...COLUMNS, userName: users.name })
        .from(successfulApplications)
        .innerJoin(users, eq(users.id, successfulApplications.userId))
        .where(like(successfulApplications.date, `${monthDate}-%`))
        .orderBy(asc(successfulApplications.date), asc(successfulApplications.id));
}

/** Where an application number is currently recorded — who it's credited to and on which day. */
export interface SuccessfulApplicationOwner {
    applicationNumber: string;
    userId: number;
    userName: string;
    date: string;
}

/**
 * Current owners of the given application numbers, across every counsellor.
 * Lets the auto-fetch diff flag rows that `replaceDailySuccessfulApplications` would
 * reject (already credited elsewhere) before anything is written.
 */
export async function findSuccessfulApplicationOwners(applicationNumbers: string[]): Promise<SuccessfulApplicationOwner[]> {
    if (applicationNumbers.length === 0) return [];
    const db = await getDb();
    return db
        .select({
            applicationNumber: successfulApplications.applicationNumber,
            userId: successfulApplications.userId,
            userName: users.name,
            date: successfulApplications.date,
        })
        .from(successfulApplications)
        .innerJoin(users, eq(users.id, successfulApplications.userId))
        .where(inArray(successfulApplications.applicationNumber, applicationNumbers));
}

/** Every successful application for one user in one "YYYY-MM" month — feeds the calendar-grid UI. */
export async function getDailySuccessfulApplicationsForMonth(userId: number, monthDate: string): Promise<SuccessfulApplicationRow[]> {
    const db = await getDb();
    return db
        .select(COLUMNS)
        .from(successfulApplications)
        .where(and(eq(successfulApplications.userId, userId), like(successfulApplications.date, `${monthDate}-%`)))
        .orderBy(asc(successfulApplications.date), asc(successfulApplications.id));
}

/**
 * One user's successful application count per day across a whole SESSION year ("YYYY",
 * October → September; see `sessionMonths`) — feeds the yearly heatmap. Days
 * with no successful applications are absent.
 */
export async function getDailySuccessfulApplicationCountsForSession(
    userId: number,
    sessionYear: string,
): Promise<{ date: string; count: number }[]> {
    const months = sessionMonths(sessionYear);
    const db = await getDb();
    const rows = await db
        .select({ date: successfulApplications.date, count: sql<number>`COUNT(*)` })
        .from(successfulApplications)
        .where(
            and(
                eq(successfulApplications.userId, userId),
                gte(successfulApplications.date, `${months[0] ?? ""}-01`),
                lte(successfulApplications.date, `${months[months.length - 1] ?? ""}-31`),
            ),
        )
        .groupBy(successfulApplications.date)
        .orderBy(asc(successfulApplications.date));
    return rows.map((row) => ({ date: row.date, count: Number(row.count) }));
}

/** One month's successful application total for one user — used by prefill/fallback paths. */
export async function sumDailyForMonth(userId: number, monthDate: string): Promise<number> {
    const db = await getDb();
    const rows = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(successfulApplications)
        .where(and(eq(successfulApplications.userId, userId), like(successfulApplications.date, `${monthDate}-%`)));
    return Number(rows[0]?.total ?? 0);
}
