"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { upsertEntry, getPreviousEntry, getProgressForMonth } from "@/db/queries/performance";
import { upsertDailyAdmission } from "@/db/queries/dailyAdmissions";
import { finalizeMonth } from "@/db/queries/finalize";
import type { AdmissionRecord, PerformanceEntry, ProgressRow } from "@/db/types";

const MONTH_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const SaveEntryInput = z.object({
    userId: z.number().int(),
    date: z.string().regex(MONTH_DATE_RE, "date must be YYYY-MM"),
    overall: z.number().int().min(0).nullable(),
    nonNegotiable: z.number().int().min(0).nullable(),
});

export async function saveEntryAction(input: z.infer<typeof SaveEntryInput>) {
    const parsed = SaveEntryInput.parse(input);
    await upsertEntry(parsed);
    refresh();
}

/** §4.3 step 6 — fetched on demand when a never-filled entry form is opened. */
export async function getPrefillAction(
    userId: number,
    date: string,
): Promise<Pick<PerformanceEntry, "overall" | "nonNegotiable"> | null> {
    const previous = await getPreviousEntry(userId, date);
    if (!previous) return null;
    return { overall: previous.overall, nonNegotiable: previous.nonNegotiable };
}

/**
 * DATA_ENTRY_INTERFACE.md §4.4 — export data source: every active counsellor,
 * blank where no entry exists yet for this month (confirmed default).
 */
export async function getExportDataAction(date: string): Promise<ProgressRow[]> {
    return getProgressForMonth(date, { includeInactive: false });
}

const AdmissionRecordSchema = z.object({
    leadId: z.string(),
    leadName: z.string(),
    leadEmail: z.string(),
});

const SaveDailyAdmissionInput = z.object({
    userId: z.number().int(),
    date: z.string().regex(DAY_DATE_RE, "date must be YYYY-MM-DD"),
    records: z.array(AdmissionRecordSchema),
});

/** Per-day save on the daily-entry page. `count` is derived from `records.length`, never typed. */
export async function saveDailyAdmissionAction(userId: number, date: string, records: AdmissionRecord[]) {
    const parsed = SaveDailyAdmissionInput.parse({ userId, date, records });
    await upsertDailyAdmission(parsed.userId, parsed.date, parsed.records);
    refresh();
}

/**
 * Manual "close the month" trigger — no Cloudflare Cron Trigger is
 * configured in wrangler.jsonc, so this is invoked by hand (or via the POST
 * endpoint at src/app/api/finalize/route.ts) rather than on a schedule.
 * Wiring an actual cron, or a UI button to call this, is a future task.
 */
export async function finalizeMonthAction(monthDate: string) {
    const parsed = z.string().regex(MONTH_DATE_RE, "date must be YYYY-MM").parse(monthDate);
    const result = await finalizeMonth(parsed);
    refresh();
    return result;
}
