"use server";

import { fetchApplicants, type Applicant } from "@/utils/meritto/fetch-applicants";

/**
 * Runs entirely on the server (this is a server action) — the live request
 * to the external endpoint never touches the browser, so no CORS block.
 *
 * Deliberately calls `fetchApplicants` rather than replaying the captured
 * curl body: that way a green test-fetch proves the exact code path
 * production uses (csrf-cookie handling + `buildRequestBody` + parse), not
 * just that the cookies are still alive. Only the credentials come from the
 * captured curl; the body is rebuilt from `counsellorId` and today's date.
 */
export async function testFetchApplicantsAction(
    url: string,
    headers: Record<string, string>,
    counsellorId: number,
): Promise<Applicant[]> {
    return fetchApplicants({ url, headers, date: new Date(), counsellorId });
}
