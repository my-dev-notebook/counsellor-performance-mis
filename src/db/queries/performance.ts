import { eq, and, or, lt, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, teams, agencies, counsellorPerformance } from "@/db/schema";
import type { CounsellorRow, MonthSummary, PerformanceEntry, ProgressRow } from "@/db/types";

function toEntry(row: {
    id: number;
    userId: number;
    year: number;
    month: number;
    overall: number | null;
    nonNegotiable: number | null;
    achieved: number | null;
    achievedFlagged: number;
    acknowledgment: number | null;
    feedback: string | null;
}): PerformanceEntry {
    return {
        ...row,
        achievedFlagged: row.achievedFlagged === 1,
        acknowledgment: row.acknowledgment === null ? null : row.acknowledgment === 1,
    };
}

export async function listMonthsWithData(): Promise<{ year: number; month: number }[]> {
    const db = await getDb();
    return db
        .selectDistinct({ year: counsellorPerformance.year, month: counsellorPerformance.month })
        .from(counsellorPerformance)
        .orderBy(desc(counsellorPerformance.year), desc(counsellorPerformance.month));
}

export async function getProgressForMonth(
    year: number,
    month: number,
    options?: { includeInactive?: boolean },
): Promise<ProgressRow[]> {
    const db = await getDb();
    const rows = await db
        .select({
            counsellor: {
                id: users.id,
                personId: users.personId,
                name: users.name,
                email: users.email,
                doj: users.doj,
                teamId: users.teamId,
                teamName: teams.name,
                agencyId: users.agencyId,
                agencyName: agencies.name,
                isActive: users.isActive,
            },
            entry: {
                id: counsellorPerformance.id,
                userId: counsellorPerformance.userId,
                year: counsellorPerformance.year,
                month: counsellorPerformance.month,
                overall: counsellorPerformance.overall,
                nonNegotiable: counsellorPerformance.nonNegotiable,
                achieved: counsellorPerformance.achieved,
                achievedFlagged: counsellorPerformance.achievedFlagged,
                acknowledgment: counsellorPerformance.acknowledgment,
                feedback: counsellorPerformance.feedback,
            },
        })
        .from(users)
        .innerJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(agencies, eq(users.agencyId, agencies.id))
        .leftJoin(
            counsellorPerformance,
            and(
                eq(counsellorPerformance.userId, users.id),
                eq(counsellorPerformance.year, year),
                eq(counsellorPerformance.month, month),
            ),
        )
        .where(options?.includeInactive ? undefined : eq(users.isActive, 1))
        .orderBy(users.name);

    return rows.map((row) => ({
        counsellor: { ...row.counsellor, isActive: row.counsellor.isActive === 1 } satisfies CounsellorRow,
        entry: row.entry ? toEntry(row.entry as Parameters<typeof toEntry>[0]) : null,
    }));
}

export async function getMonthSummary(
    year: number,
    month: number,
    options?: { includeInactive?: boolean },
): Promise<MonthSummary> {
    const progress = await getProgressForMonth(year, month, options);
    const totalCount = progress.length;
    const filled = progress.filter((p) => p.entry !== null);
    const filledCount = filled.length;
    const targetSoFar = filled.reduce((sum, p) => sum + (p.entry?.overall ?? 0), 0);
    const achievedSoFar = filled
        .filter((p) => p.entry && !p.entry.achievedFlagged && p.entry.achieved !== null)
        .reduce((sum, p) => sum + (p.entry?.achieved ?? 0), 0);
    return { filledCount, totalCount, targetSoFar, achievedSoFar };
}

/** DATA_ENTRY_INTERFACE.md §4.3 step 6 — prefill source: most recent entry strictly before (year, month). */
export async function getPreviousEntry(userId: number, year: number, month: number): Promise<PerformanceEntry | null> {
    const db = await getDb();
    const rows = await db
        .select()
        .from(counsellorPerformance)
        .where(
            and(
                eq(counsellorPerformance.userId, userId),
                or(
                    lt(counsellorPerformance.year, year),
                    and(eq(counsellorPerformance.year, year), lt(counsellorPerformance.month, month)),
                ),
            ),
        )
        .orderBy(desc(counsellorPerformance.year), desc(counsellorPerformance.month))
        .limit(1);
    const row = rows[0];
    return row ? toEntry(row) : null;
}

/** §4.3 step 5 — one Save action, upsert via the (user_id, year, month) unique index. */
export async function upsertEntry(input: {
    userId: number;
    year: number;
    month: number;
    overall: number | null;
    nonNegotiable: number | null;
    achieved: number | null;
    achievedFlagged: boolean;
    acknowledgment: boolean | null;
    feedback: string | null;
}): Promise<void> {
    const db = await getDb();
    const values = {
        userId: input.userId,
        year: input.year,
        month: input.month,
        overall: input.overall,
        nonNegotiable: input.nonNegotiable,
        achieved: input.achieved,
        achievedFlagged: input.achievedFlagged ? 1 : 0,
        acknowledgment: input.acknowledgment === null ? null : input.acknowledgment ? 1 : 0,
        feedback: input.feedback,
    };
    await db
        .insert(counsellorPerformance)
        .values(values)
        .onConflictDoUpdate({
            target: [counsellorPerformance.userId, counsellorPerformance.year, counsellorPerformance.month],
            set: { ...values, updatedAt: sql`(datetime('now'))` },
        });
}
