"use server";

import { fetchApplicationList } from "@/utils/meritto/fetch-application-list";
import type { Applicant } from "@/utils/meritto/fetch-applicants";

const VERIFY_PAGE_SIZE = 10;

/**
 * Runs entirely on the server (this is a server action) — the live request
 * to the external endpoint never touches the browser, so no CORS block.
 *
 * Calls `fetchApplicationList`, which rebuilds the application-manager
 * listing body from scratch: only the credentials (URL, headers, cookies)
 * come from the captured curl, so a non-empty result proves the session is
 * usable rather than just that the pasted body replays.
 */
export async function verifyMerittoSessionAction(
    url: string,
    headers: Record<string, string>,
): Promise<Applicant[]> {
    return fetchApplicationList({ url, headers, page: 0, perPageRecord: VERIFY_PAGE_SIZE });
}
