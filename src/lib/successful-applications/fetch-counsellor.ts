import { getActiveUserById } from "@/db/queries/users";
import { userReadableInScope } from "@/db/queries/performance";
import { fetchApplicants } from "@/utils/meritto/fetch-applicants";
import type { FetchedSuccessfulApplication } from "@/lib/successful-applications/diff";
import type { Scope } from "@/lib/auth/permissions";
import { DayDate, MonthDate } from "@/schemas/dates";

/** Either one day ("YYYY-MM-DD") or a whole month ("YYYY-MM") of the daily-entry page. */
export type FetchWindow = { day: string } | { month: string };

/**
 * Ask Meritto for the online-paid applicants `userId`'s counsellor closed
 * in the range, each placed on its day. The request body is built from
 * scratch by `fetchApplicants`, so only the session's credentials are
 * reused, not its filters.
 *
 * `userId` is our own users.id; Meritto keys applicants by the counsellor's
 * `meritto_user_id`, so it is resolved here rather than trusted from the
 * client. A user without a Meritto id cannot be fetched for.
 */
export async function fetchCounsellorSuccessfulApplications(
    url: string,
    headers: Record<string, string>,
    userId: number,
    range: FetchWindow,
    scope: Scope,
): Promise<FetchedSuccessfulApplication[]> {
    const counsellor = await getActiveUserById(userId);
    if (!counsellor || !(await userReadableInScope(userId, scope))) {
        throw new Error(`fetchCounsellorSuccessfulApplications: no active user with id ${String(userId)}`);
    }
    if (counsellor.merittoUserId === null) {
        throw new Error(`fetchCounsellorSuccessfulApplications: ${counsellor.name} has no Meritto user id`);
    }

    // Window bounds as local Dates for the request body.
    let from: Date;
    let to: Date;
    if ("day" in range) {
        const day = DayDate.parse(range.day);
        from = to = new Date(`${day}T00:00:00`);
    } else {
        const [y, m] = MonthDate.parse(range.month)
            .split("-")
            .map((v) => Number.parseInt(v, 10));
        from = new Date(y ?? 0, (m ?? 1) - 1, 1);
        to = new Date(y ?? 0, m ?? 1, 0);
    }

    const applicants = await fetchApplicants({ url, headers, from, to, counsellorId: counsellor.merittoUserId });

    // Place each row on its day. A single-day range is authoritative on its
    // own; a month range needs the listing's date column for every row —
    // a row without one can't be filed anywhere, so fail loudly.
    return applicants.map((a) => {
        const date = "day" in range ? range.day : a.paymentApprovedDate;
        if (date === "") {
            throw new Error(`fetchCounsellorSuccessfulApplications: ${a.applicationNumber} has no payment approved date`);
        }
        // The scraper yields every field as a string straight out of the HTML;
        // `successful_applications` stores the two ids as integers. Coerce here, at the boundary.
        return {
            date,
            record: {
                applicationNumber: a.applicationNumber,
                applicantUserId: Number(a.userId),
                applicantName: a.registeredName,
                formId: Number(a.formId),
                formName: a.formName,
            },
        };
    });
}
