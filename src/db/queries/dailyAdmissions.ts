import { eq, and, like, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { counsellorPerfDaily } from "@/db/schema";
import type { AdmissionRecord, DailyAdmission } from "@/db/types";

/**
 * Upsert one day's admission records for a counsellor. `count` is derived
 * from `records.length` here — callers never supply it directly.
 */
export async function upsertDailyAdmission(userId: number, date: string, records: AdmissionRecord[]): Promise<void> {
    const db = await getDb();
    const count = records.length;
    const metadata = count > 0 ? JSON.stringify(records) : null;
    const values = { userId, date, count, metadata };
    await db
        .insert(counsellorPerfDaily)
        .values(values)
        .onConflictDoUpdate({
            target: [counsellorPerfDaily.userId, counsellorPerfDaily.date],
            set: { ...values, updatedAt: sql`(datetime('now'))` },
        });
}

/** All daily rows for one user in one "YYYY-MM" month — feeds the calendar-grid UI. */
export async function getDailyAdmissionsForMonth(userId: number, monthDate: string): Promise<DailyAdmission[]> {
    const db = await getDb();
    return db
        .select()
        .from(counsellorPerfDaily)
        .where(and(eq(counsellorPerfDaily.userId, userId), like(counsellorPerfDaily.date, `${monthDate}-%`)))
        .orderBy(asc(counsellorPerfDaily.date));
}

/** Single sum of a month's daily counts for one user — used by prefill/fallback paths. */
export async function sumDailyForMonth(userId: number, monthDate: string): Promise<number> {
    const db = await getDb();
    const rows = await db
        .select({ total: sql<number>`SUM(${counsellorPerfDaily.count})` })
        .from(counsellorPerfDaily)
        .where(and(eq(counsellorPerfDaily.userId, userId), like(counsellorPerfDaily.date, `${monthDate}-%`)));
    return Number(rows[0]?.total ?? 0);
}
