import { eq, and, lt, desc, sql, like } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, teams, agencies, counsellorPerfMonthly, admissions } from "@/db/schema";
import type { CounsellorRow, MonthSummary, PerformanceEntry, ProgressRow } from "@/db/types";

function toEntry(row: {
    id: number;
    userId: number;
    date: string;
    overall: number | null;
    nonNegotiable: number | null;
    achieved: number | null;
}): PerformanceEntry {
    return { ...row };
}

/** Previous calendar month's "YYYY-MM" string, e.g. "2026-09" -> "2026-08". */
function previousMonthDate(date: string): string {
    const [yearStr, monthStr] = date.split("-");
    const year = Number.parseInt(yearStr ?? "", 10);
    const month = Number.parseInt(monthStr ?? "", 10);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return `${String(prevYear)}-${String(prevMonth).padStart(2, "0")}`;
}

export async function listMonthsWithData(): Promise<string[]> {
    const db = await getDb();
    const rows = await db
        .selectDistinct({ date: counsellorPerfMonthly.date })
        .from(counsellorPerfMonthly)
        .orderBy(desc(counsellorPerfMonthly.date));
    return rows.map((r) => r.date);
}

/**
 * Live "achieved" for every counsellor in one month: COUNT(*) of `admissions`
 * rows whose date falls inside the given "YYYY-MM" month, grouped by user. One
 * query, used to avoid N+1 lookups from getProgressForMonth's per-counsellor
 * list.
 */
export async function getAchievedForCounsellors(monthDate: string): Promise<Map<number, number>> {
    const db = await getDb();
    const rows = await db
        .select({ userId: admissions.userId, total: sql<number>`COUNT(*)` })
        .from(admissions)
        .where(like(admissions.date, `${monthDate}-%`))
        .groupBy(admissions.userId);
    return new Map(rows.map((r) => [r.userId, Number(r.total)]));
}

/** Single-counsellor version of getAchievedForCounsellors, for one-off lookups. */
export async function getAchievedForMonth(userId: number, monthDate: string): Promise<number> {
    const db = await getDb();
    const rows = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(admissions)
        .where(and(eq(admissions.userId, userId), like(admissions.date, `${monthDate}-%`)));
    return Number(rows[0]?.total ?? 0);
}

export async function getProgressForMonth(
    date: string,
    options?: { includeInactive?: boolean },
): Promise<ProgressRow[]> {
    const db = await getDb();
    const [rows, liveAchieved] = await Promise.all([
        db
            .select({
                counsellor: {
                    id: users.id,
                    personId: users.personId,
                    name: users.name,
                    email: users.email,
                    merittoUserId: users.merittoUserId,
                    teamId: users.teamId,
                    teamName: teams.name,
                    agencyId: users.agencyId,
                    agencyName: agencies.name,
                    isActive: users.isActive,
                },
                entry: {
                    id: counsellorPerfMonthly.id,
                    userId: counsellorPerfMonthly.userId,
                    date: counsellorPerfMonthly.date,
                    overall: counsellorPerfMonthly.overall,
                    nonNegotiable: counsellorPerfMonthly.nonNegotiable,
                    achieved: counsellorPerfMonthly.achieved,
                },
            })
            .from(users)
            .innerJoin(teams, eq(users.teamId, teams.id))
            .leftJoin(agencies, eq(users.agencyId, agencies.id))
            .leftJoin(
                counsellorPerfMonthly,
                and(eq(counsellorPerfMonthly.userId, users.id), eq(counsellorPerfMonthly.date, date)),
            )
            .where(options?.includeInactive ? undefined : eq(users.isActive, 1))
            .orderBy(users.name),
        getAchievedForCounsellors(date),
    ]);

    return rows.map((row) => {
        const counsellor = { ...row.counsellor, isActive: row.counsellor.isActive === 1 } satisfies CounsellorRow;
        if (row.entry === null) {
            return { counsellor, entry: null };
        }
        const entry = toEntry(row.entry as Parameters<typeof toEntry>[0]);
        // Finalized months carry a written `achieved`; a live/open month falls
        // back to the on-the-fly daily sum.
        if (entry.achieved === null) {
            entry.achieved = liveAchieved.get(counsellor.id) ?? 0;
        }
        return { counsellor, entry };
    });
}

export async function getMonthSummary(date: string, options?: { includeInactive?: boolean }): Promise<MonthSummary> {
    const progress = await getProgressForMonth(date, options);
    const totalCount = progress.length;
    const filled = progress.filter((p) => p.entry !== null);
    const filledCount = filled.length;
    const targetSoFar = filled.reduce((sum, p) => sum + (p.entry?.overall ?? 0), 0);
    const achievedSoFar = filled
        .filter((p) => p.entry && p.entry.achieved !== null)
        .reduce((sum, p) => sum + (p.entry?.achieved ?? 0), 0);
    return { filledCount, totalCount, targetSoFar, achievedSoFar };
}

/** DATA_ENTRY_INTERFACE.md §4.3 step 6 — prefill source: most recent entry strictly before `date`. */
export async function getPreviousEntry(userId: number, date: string): Promise<PerformanceEntry | null> {
    const db = await getDb();
    const rows = await db
        .select()
        .from(counsellorPerfMonthly)
        .where(and(eq(counsellorPerfMonthly.userId, userId), lt(counsellorPerfMonthly.date, date)))
        .orderBy(desc(counsellorPerfMonthly.date))
        .limit(1);
    const row = rows[0];
    return row ? toEntry(row) : null;
}

/** §4.3 step 5 — one Save action, upsert via the (user_id, date) unique index. */
export async function upsertEntry(input: {
    userId: number;
    date: string;
    overall: number | null;
    nonNegotiable: number | null;
}): Promise<void> {
    const db = await getDb();
    const values = {
        userId: input.userId,
        date: input.date,
        overall: input.overall,
        nonNegotiable: input.nonNegotiable,
    };
    await db
        .insert(counsellorPerfMonthly)
        .values(values)
        .onConflictDoUpdate({
            target: [counsellorPerfMonthly.userId, counsellorPerfMonthly.date],
            set: { ...values, updatedAt: sql`(datetime('now'))` },
        });
}

export { previousMonthDate };
