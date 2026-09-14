import { desc, like, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { admissions, counsellorPerfMonthly } from "@/db/schema";

/**
 * Closes out a month: counts `admissions` per counsellor and writes
 * the total into `counsellor_perf_monthly.achieved`, so future reads of that
 * month are a single cheap lookup instead of a live daily-sum query.
 *
 * If a counsellor has no `counsellor_perf_monthly` row yet for this month,
 * one is created with `overall`/`nonNegotiable` left null (those targets are
 * set separately via the entry form; finalize only owns `achieved`). The new
 * row's `team_id`/`agency_id` snapshot is taken from the month's admissions
 * themselves (the assignment most of them were recorded under), not from the
 * user's current row, so finalizing a month long after a team change still
 * files it under the right team. An existing row keeps its snapshot.
 *
 * Currently invoked manually (no Cloudflare Cron Trigger configured in
 * wrangler.jsonc) via the POST endpoint at src/app/api/finalize/route.ts and
 * the entry page's finalize action.
 */
export async function finalizeMonth(monthDate: string): Promise<{ updated: number }> {
    const db = await getDb();
    const grouped = await db
        .select({
            userId: admissions.userId,
            teamId: admissions.teamId,
            agencyId: admissions.agencyId,
            total: sql<number>`COUNT(*)`,
        })
        .from(admissions)
        .where(like(admissions.date, `${monthDate}-%`))
        .groupBy(admissions.userId, admissions.teamId, admissions.agencyId)
        .orderBy(desc(sql`COUNT(*)`));

    const perUser = new Map<number, { teamId: number; agencyId: number | null; achieved: number }>();
    for (const row of grouped) {
        const current = perUser.get(row.userId);
        if (current) {
            current.achieved += Number(row.total);
        } else {
            // First group per user is the largest, thanks to the ORDER BY.
            perUser.set(row.userId, { teamId: row.teamId, agencyId: row.agencyId, achieved: Number(row.total) });
        }
    }

    let updated = 0;
    for (const [userId, { teamId, agencyId, achieved }] of perUser) {
        await db
            .insert(counsellorPerfMonthly)
            .values({ userId, teamId, agencyId, date: monthDate, overall: null, nonNegotiable: null, achieved })
            .onConflictDoUpdate({
                target: [counsellorPerfMonthly.userId, counsellorPerfMonthly.date],
                set: { achieved, updatedAt: sql`(datetime('now'))` },
            });
        updated += 1;
    }
    return { updated };
}
