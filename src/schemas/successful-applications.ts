import { z } from "zod";
import { DayDate } from "@/schemas/dates";

/**
 * One successful application's details as they cross the client/server boundary: the
 * `successful_applications` row payload minus the DB-owned `id`/`user_id`/`date`, which the
 * save action supplies from its own arguments.
 *
 * Mirrors `Applicant` from `@/utils/meritto/fetch-applicants`, except that
 * `applicantUserId`/`formId` are numbers here: the scraper yields strings
 * straight out of the HTML, and the action layer coerces them at the boundary
 * to match the integer columns.
 *
 * Every field is mandatory. The `successful_applications` columns are all notNull and the
 * ids carry `> 0` CHECKs, so this schema is the client-side mirror of
 * constraints the DB also enforces — `min(1)` rejects the blank rows the entry
 * grid starts with, which are filtered out before save rather than written as
 * empties.
 */
export const SuccessfulApplicationRecord = z.object({
    applicationNumber: z.string().trim().min(1),
    applicantUserId: z.number().int().positive(),
    applicantName: z.string().trim().min(1),
    formId: z.number().int().positive(),
    formName: z.string().trim().min(1),
});
export type SuccessfulApplicationRecord = z.infer<typeof SuccessfulApplicationRecord>;

/**
 * One day's save from the daily-entry grid. No count is submitted or stored —
 * the day's total is COUNT(*) over the rows written. An empty `records` array
 * is valid: it clears the day.
 */
export const SaveDailySuccessfulApplicationInput = z.object({
    userId: z.number().int(),
    date: DayDate,
    records: z.array(SuccessfulApplicationRecord),
});
export type SaveDailySuccessfulApplicationInput = z.infer<typeof SaveDailySuccessfulApplicationInput>;

/**
 * Auto-fetch apply: several days of one counsellor, written as a whole (see
 * `replaceDailySuccessfulApplications`). A day with no records clears that day.
 * `reclaim` is only set by the all-counsellors fetch.
 */
export const ApplyFetchedSuccessfulApplicationsInput = z.object({
    userId: z.number().int(),
    days: z.array(z.object({ date: DayDate, records: z.array(SuccessfulApplicationRecord) })).min(1),
    /** Application numbers to take over from other counsellors first (moves the operator accepted). */
    reclaim: z.array(z.string().trim().min(1)).optional(),
});
export type ApplyFetchedSuccessfulApplicationsInput = z.infer<typeof ApplyFetchedSuccessfulApplicationsInput>;
