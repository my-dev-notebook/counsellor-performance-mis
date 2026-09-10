import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { counsellorPerfMonthly } from "@/db/schema";
import { getAchievedForCounsellors } from "@/db/queries/performance";

/**
 * Closes out a month: counts `admissions` per counsellor and writes
 * the total into `counsellor_perf_monthly.achieved`, so future reads of that
 * month are a single cheap lookup instead of a live daily-sum query.
 *
 * If a counsellor has no `counsellor_perf_monthly` row yet for this month,
 * one is created with `overall`/`nonNegotiable` left null (simplest option —
 * those targets are set separately via the entry form; finalize only owns
 * `achieved`).
 *
 * Currently invoked manually (no Cloudflare Cron Trigger configured in
 * wrangler.jsonc) via the POST endpoint at src/app/api/finalize/route.ts.
 * Wiring an actual cron trigger, or a UI button to call this, is a future
 * task — not in scope for this pass.
 */
export async function finalizeMonth(monthDate: string): Promise<{ updated: number }> {
    const db = await getDb();
    const totals = await getAchievedForCounsellors(monthDate);

    let updated = 0;
    for (const [userId, achieved] of totals) {
        await db
            .insert(counsellorPerfMonthly)
            .values({ userId, date: monthDate, overall: null, nonNegotiable: null, achieved })
            .onConflictDoUpdate({
                target: [counsellorPerfMonthly.userId, counsellorPerfMonthly.date],
                set: { achieved, updatedAt: sql`(datetime('now'))` },
            });
        updated += 1;
    }
    return { updated };
}
