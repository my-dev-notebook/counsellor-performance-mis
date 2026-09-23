"use server";

import { refresh } from "next/cache";
import { upsertEntry, getPreviousEntry, getProgressForMonth, userReadableInScope } from "@/db/queries/performance";
import {
    upsertDailySuccessfulApplication,
    replaceDailySuccessfulApplications,
    getDailySuccessfulApplicationsForMonth,
    findSuccessfulApplicationOwners,
} from "@/db/queries/dailySuccessfulApplications";
import { finalizeMonth } from "@/db/queries/finalize";
import type { PerformanceEntry, ProgressRow } from "@/db/types";
import { SuccessfulApplicationRecord, SaveDailySuccessfulApplicationInput, ApplyFetchedSuccessfulApplicationsInput } from "@/schemas/successful-applications";
import { SaveEntryInput } from "@/schemas/entry";
import { DayDate, MonthDate } from "@/schemas/dates";
import { diffDays, hasChanges } from "@/lib/successful-applications/diff";
import type { SuccessfulApplicationConflict, DayDiff } from "@/lib/successful-applications/diff";
import { fetchCounsellorSuccessfulApplications } from "@/lib/successful-applications/fetch-counsellor";
import type { FetchWindow } from "@/lib/successful-applications/fetch-counsellor";
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
export async function saveDailySuccessfulApplicationAction(userId: number, date: string, records: SuccessfulApplicationRecord[]) {
    const parsed = SaveDailySuccessfulApplicationInput.parse({ userId, date, records });
    const actor = await assertPermission("writeEntries");
    if (!(await userReadableInScope(parsed.userId, actor.scope))) throw new Error("User not found");
    await upsertDailySuccessfulApplication(parsed.userId, parsed.date, parsed.records);
    refresh();
}

export type { SuccessfulApplicationConflict };

export interface SuccessfulApplicationFetchDiff {
    /** Only days where the DB and Meritto disagree, in date order. */
    days: DayDiff[];
    /** Rows left out of `days[].fetched` because another counsellor/day owns them. */
    conflicts: SuccessfulApplicationConflict[];
    /** How many rows Meritto returned in total, before conflicts were dropped. */
    fetchedCount: number;
}

export type { FetchWindow };

/**
 * Auto-fetch from the daily-entry page: reuses the url/headers captured
 * earlier via the Meritto Auth tool, fetches the range for one counsellor
 * (see `fetchCounsellorSuccessfulApplications`) and diffs it against what the DB holds
 * for those days. Nothing is written — the caller shows the diff and calls
 * `applyFetchedSuccessfulApplicationsAction` with the days it wants replaced.
 */
export async function fetchSuccessfulApplicationDiffAction(
    url: string,
    headers: Record<string, string>,
    userId: number,
    range: FetchWindow,
): Promise<SuccessfulApplicationFetchDiff> {
    const actor = await assertPermission("writeEntries");
    const monthDate = "day" in range ? DayDate.parse(range.day).slice(0, 7) : MonthDate.parse(range.month);
    const applicants = await fetchCounsellorSuccessfulApplications(url, headers, userId, range, actor.scope);

    const fetchedByDate = new Map<string, SuccessfulApplicationRecord[]>();
    for (const { date, record } of applicants) {
        fetchedByDate.set(date, [...(fetchedByDate.get(date) ?? []), record]);
    }

    // Baseline: the DB's rows for the same days.
    const existingByDate = new Map<string, SuccessfulApplicationRecord[]>();
    for (const row of await getDailySuccessfulApplicationsForMonth(userId, monthDate)) {
        if ("day" in range && row.date !== range.day) continue;
        existingByDate.set(row.date, [
            ...(existingByDate.get(row.date) ?? []),
            {
                applicationNumber: row.applicationNumber,
                applicantUserId: row.applicantUserId,
                applicantName: row.applicantName,
                formId: row.formId,
                formName: row.formName,
            },
        ]);
    }

    // Rows already credited to someone else, or to one of this counsellor's
    // days outside the range, would trip the unique constraint on apply.
    // Drop them from the fetched set and report them instead. A row that
    // merely moved between two days INSIDE the range is fine: the apply
    // clears every range day before inserting.
    const owners = await findSuccessfulApplicationOwners(applicants.map((a) => a.record.applicationNumber));
    const ownerByNumber = new Map(owners.map((o) => [o.applicationNumber, o]));
    const conflicts: SuccessfulApplicationConflict[] = [];
    for (const [date, records] of fetchedByDate) {
        const kept = records.filter((record) => {
            const owner = ownerByNumber.get(record.applicationNumber);
            if (!owner) return true;
            const insideWindow = owner.userId === userId && ("day" in range ? owner.date === range.day : owner.date.startsWith(`${monthDate}-`));
            if (insideWindow) return true;
            conflicts.push({ date, record, ownerName: owner.userName, ownerDate: owner.date });
            return false;
        });
        fetchedByDate.set(date, kept);
    }

    const days = diffDays(existingByDate, fetchedByDate).filter(hasChanges);
    return { days, conflicts, fetchedCount: applicants.length };
}

/**
 * Second half of the auto-fetch: write the fetched rows for the given days,
 * replacing whatever the DB had for them. Unlike `saveDailySuccessfulApplicationAction`
 * this can cover many days, and it clears all of them before inserting so an
 * application that moved between days inside the set doesn't collide with
 * itself.
 */
export async function applyFetchedSuccessfulApplicationsAction(input: ApplyFetchedSuccessfulApplicationsInput) {
    const parsed = ApplyFetchedSuccessfulApplicationsInput.parse(input);
    const actor = await assertPermission("writeEntries");
    if (!(await userReadableInScope(parsed.userId, actor.scope))) throw new Error("User not found");
    await replaceDailySuccessfulApplications(parsed.userId, parsed.days, parsed.reclaim ?? []);
    refresh();
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
