import { parseApplicants, type Applicant } from "./fetch-applicants";

/**
 * Fetches a page of the *unfiltered* application-manager listing.
 *
 * This is a different request from `fetchApplicants`: no counsellor and no
 * payment-date advance filter, just "every application this login can see",
 * newest first, paged. Captured from the application-manager screen.
 *
 * The captured curl also carries a `leadsListFilters` blob — the screen's
 * client-side state, including the logged-in user's own identity. The endpoint
 * answers the same way without it (verified against the live endpoint), so it
 * is deliberately not rebuilt here.
 */
export async function fetchApplicationList({
    url,
    headers,
    page = 0,
    perPageRecord = 10,
    date = new Date(),
}: {
    url: string;
    headers: Record<string, string>;
    /** 0-based; the listing offset is `page * perPageRecord`. */
    page?: number;
    perPageRecord?: number;
    /** Upper bound of the registration-date window; defaults to today. */
    date?: Date;
}): Promise<Applicant[]> {
    const headersWithCsrfToken = withCsrfToken(headers);
    const csrfToken = headersWithCsrfToken["x-csrf-token"];

    const body = buildApplicationListBody({ csrfToken, page, perPageRecord, date });

    const response = await fetch(url, { method: "POST", headers: headersWithCsrfToken, body });

    if (!response.ok) {
        throw new Error(`fetchApplicationList: request failed with status ${response.status.toString()}`);
    }

    return parseApplicants(await response.text());
}

function withCsrfToken(headers: Record<string, string>) {
    const headerNameKey = Object.keys(headers).find((key) => key.toLowerCase() === "x-csrf-token");
    const csrfToken = headerNameKey ? headers[headerNameKey] : undefined;

    if (!csrfToken) {
        throw new Error("fetchApplicationList: missing required 'x-csrf-token' header");
    }

    const cookieKey = Object.keys(headers).find((key) => key.toLowerCase() === "cookie");
    const existingCookie = cookieKey ? headers[cookieKey] : "";
    const cookie = existingCookie ? `${existingCookie}; csrfToken=${csrfToken}` : `csrfToken=${csrfToken}`;

    return { ...headers, [cookieKey ?? "cookie"]: cookie, "x-csrf-token": csrfToken };
}

export function buildApplicationListBody({
    csrfToken,
    page,
    perPageRecord,
    date,
}: {
    csrfToken: string;
    page: number;
    perPageRecord: number;
    date: Date;
}): string {
    const snapshotFormList = 1410;
    const checksum = "f9008bc4ece8c7931ce654299e9861df";

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatDate = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString()}`;

    const params = new URLSearchParams();

    function set(k: string, v: string | number) {
        params.set(k, String(v));
    }

    set("_method", "POST");
    set("_csrfToken", csrfToken);
    set("filer_column_hit", "");
    set("adv_column", "");
    set("adv_value", "");
    set("multi_select_city", "yes");
    set("urlApplicantId", 0);
    set("exporttype", "applicationscsv");
    set("payment_config_name", "Payment");
    set("h_form_id", 0);
    set("search_by_field", "email");
    set("search_common", "");
    // Total-row count the screen echoes back; the server fills it in itself.
    set("all_records", "");
    set("per_page_record", perPageRecord);
    set("snapshot_form_list", snapshotFormList);
    // Registration-date bound: fixed lower bound, upper bound = the given date.
    set("final_registration_date", `01/01/2017,${formatDate(date)}`);
    set("app_block_condition", "");
    set("s_college_id", 257);
    set("form_id", 0);
    set("module_filter", "am_filter_v2");
    set("ctype", "applications");
    set("fdid", 0);
    // Offset of the first row on this page.
    set("current_record", page * perPageRecord);
    set("sort_options", "");
    set("realignment_order", "");
    set("checksum", checksum);
    set("am_listing", 1);
    set("page", page);
    set("quick_filter[0][condition]", "and");
    set("quick_filter[0][0][fields]", "");
    set("quick_filter[0][0][types]", "");
    set("quick_filter[0][0][values][]", "");
    set("college_session_id", "");

    return params.toString();
}
