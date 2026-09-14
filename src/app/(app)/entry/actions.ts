"use server";

import { refresh } from "next/cache";
import { upsertEntry, getPreviousEntry, getProgressForMonth, userReadableInScope } from "@/db/queries/performance";
import { upsertDailyAdmission } from "@/db/queries/dailyAdmissions";
import { finalizeMonth } from "@/db/queries/finalize";
import type { PerformanceEntry, ProgressRow } from "@/db/types";
import { AdmissionRecord, SaveDailyAdmissionInput } from "@/schemas/admissions";
import { SaveEntryInput } from "@/schemas/entry";
import { DayDate, MonthDate } from "@/schemas/dates";
import { getActiveUserById } from "@/db/queries/users";
import { fetchApplicants } from "@/utils/meritto/fetch-applicants";
import { assertPermission } from "@/lib/auth/session";

export async function saveEntryAction(input: SaveEntryInput) {
    const parsed = SaveEntryInput.parse(input);
    const actor = await assertPermission("writeEntries");
    if (!(await userReadableInScope(parsed.userId, actor.scope))) throw new Error("User not found");
    await upsertEntry(parsed);
    refresh();
}

/** Fetched on demand when a never-filled entry form is opened. */
export async function getPrefillAction(
    userId: number,
    date: string,
): Promise<Pick<PerformanceEntry, "overall" | "nonNegotiable"> | null> {
    const actor = await assertPermission("writeEntries");
    if (!(await userReadableInScope(userId, actor.scope))) return null;
    const previous = await getPreviousEntry(userId, date);
    if (!previous) return null;
    return { overall: previous.overall, nonNegotiable: previous.nonNegotiable };
}

/** Export data source: every active counsellor the user may see, blank where no entry exists yet for this month. */
export async function getExportDataAction(date: string): Promise<ProgressRow[]> {
    const actor = await assertPermission("writeEntries");
    return getProgressForMonth(date, actor.scope, { includeInactive: false });
}

/**
 * Per-day save on the daily-entry page. No count is stored or typed -- the day's
 * total is COUNT(*) over the rows written here.
 */
export async function saveDailyAdmissionAction(userId: number, date: string, records: AdmissionRecord[]) {
    const parsed = SaveDailyAdmissionInput.parse({ userId, date, records });
    const actor = await assertPermission("writeEntries");
    if (!(await userReadableInScope(parsed.userId, actor.scope))) throw new Error("User not found");
    await upsertDailyAdmission(parsed.userId, parsed.date, parsed.records);
    refresh();
}

/**
 * Auto-fetch from the daily-entry page: reuses the url/headers captured
 * earlier via the Meritto Auth tool and asks Meritto for the applicants that
 * `userId`'s counsellor closed on `date` (YYYY-MM-DD). The request body is
 * built from scratch by `fetchApplicants`, so only the session's credentials
 * are reused, not its filters. The caller merges the result into the day's
 * rows.
 *
 * `userId` is our own users.id; Meritto keys applicants by the counsellor's
 * `meritto_user_id`, so it is resolved here rather than trusted from the
 * client. A user without a Meritto id cannot be auto-fetched for.
 */
export async function autoFetchApplicantsAction(
    url: string,
    headers: Record<string, string>,
    userId: number,
    date: string,
): Promise<AdmissionRecord[]> {
    const parsedDate = DayDate.parse(date);
    const actor = await assertPermission("writeEntries");
    const counsellor = await getActiveUserById(userId);
    if (!counsellor || !(await userReadableInScope(userId, actor.scope))) {
        throw new Error(`autoFetchApplicantsAction: no active user with id ${String(userId)}`);
    }
    if (counsellor.merittoUserId === null) {
        throw new Error(`autoFetchApplicantsAction: ${counsellor.name} has no Meritto user id`);
    }
    const applicants = await fetchApplicants({
        url,
        headers,
        date: new Date(`${parsedDate}T00:00:00`),
        counsellorId: counsellor.merittoUserId,
    });
    // The scraper yields every field as a string straight out of the HTML;
    // `admissions` stores the two ids as integers. Coerce here, at the boundary.
    return applicants.map((a) => ({
        applicationNumber: a.applicationNumber,
        applicantUserId: Number(a.userId),
        applicantName: a.registeredName,
        formId: Number(a.formId),
        formName: a.formName,
    }));
}

/**
 * Manual "close the month" trigger — no Cloudflare Cron Trigger is
 * configured in wrangler.jsonc, so this is invoked by hand (or via the POST
 * endpoint at src/app/api/finalize/route.ts) rather than on a schedule.
 */
export async function finalizeMonthAction(monthDate: string) {
    const parsed = MonthDate.parse(monthDate);
    await assertPermission("writeEntries");
    const result = await finalizeMonth(parsed);
    refresh();
    return result;
}
