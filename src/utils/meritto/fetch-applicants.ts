// `cheerio/slim` parses with htmlparser2 only. The full `cheerio` entry pulls in
// `undici` for its `fromURL` helper, and undici touches the `MessagePort` global
// at import time, which the Cloudflare Workers runtime does not define
// ("ReferenceError: MessagePort is not defined"). We only need `load`.
import * as cheerio from "cheerio/slim";

export interface Applicant {
    userId: string;
    formId: string;
    registeredName: string;
    applicationNumber: string;
    formName: string;
    /**
     * "YYYY-MM-DD" from the listing's "Payment Approved Date" column, or ""
     * when the column is absent or unparsable. This is what places a row on a
     * day when a multi-day window is fetched.
     */
    paymentApprovedDate: string;
}

export interface FetchWindowArgs {
    url: string;
    headers: Record<string, string>;
    /** Closed day window; pass the same day for both bounds to fetch one day. */
    from: Date;
    to: Date;
    counsellorId: number;
}

/**
 * How many applicants `fetchApplicants` would return for the same window —
 * the listing's `type=total_record` variant, which answers with a bare
 * number instead of rows.
 */
export async function fetchApplicantCount({ url, headers, from, to, counsellorId }: FetchWindowArgs): Promise<number> {
    const headersWithCsrfToken = withCsrfToken(headers);
    const csrfToken = headersWithCsrfToken["x-csrf-token"];

    const body = buildRequestBody({ from, to, counsellorId, csrfToken, mode: "count" });
    const response = await fetch(url, { method: "POST", headers: headersWithCsrfToken, body });
    if (!response.ok) {
        throw new Error(`fetchApplicantCount: request failed with status ${response.status.toString()}`);
    }

    const text = (await response.text()).trim();
    if (!/^\d+$/.test(text)) {
        throw new Error(`fetchApplicantCount: expected a number, got ${JSON.stringify(text.slice(0, 80))}`);
    }
    return Number.parseInt(text, 10);
}

/**
 * Applicants whose payment was approved (online only) inside the window,
 * credited to `counsellorId`. Asks for the count first, then reads exactly
 * the pages needed.
 */
export async function fetchApplicants(args: FetchWindowArgs): Promise<Applicant[]> {
    const { url, headers, from, to, counsellorId } = args;
    const headersWithCsrfToken = withCsrfToken(headers);
    const csrfToken = headersWithCsrfToken["x-csrf-token"];

    const total = await fetchApplicantCount(args);
    if (total === 0) return [];
    // The listing refuses any offset >= 1000 (returns nothing), so a window
    // with more rows than that cannot be read in full. One counsellor's month
    // is nowhere near it; refuse rather than return a silently truncated set.
    if (total > MAX_ROWS) {
        throw new Error(`fetchApplicants: ${String(total)} rows in the window; Meritto's listing stops at ${String(MAX_ROWS)}`);
    }

    // Meritto honours `per_page_record` only up to 100 — anything larger
    // silently falls back to 10 (verified live: 99 → 99 rows, 101 → 10).
    const pageCount = Math.ceil(total / PAGE_SIZE);
    const pages = await Promise.all(
        Array.from({ length: pageCount }, async (_, page) => {
            const body = buildRequestBody({ from, to, counsellorId, csrfToken, page });
            const response = await fetch(url, { method: "POST", headers: headersWithCsrfToken, body });
            if (!response.ok) {
                throw new Error(`fetchApplicants: page ${String(page)} failed with status ${response.status.toString()}`);
            }
            return parseApplicants(await response.text());
        }),
    );
    return pages.flat();
}

/** Largest page Meritto honours; see `fetchApplicants`. */
export const PAGE_SIZE = 100;
/** Largest offset the listing serves is 999; see `fetchApplicants`. */
const MAX_ROWS = 1000;

function withCsrfToken(headers: Record<string, string>) {
    const headerNameKey = Object.keys(headers).find((key) => key.toLowerCase() === "x-csrf-token");
    const csrfToken = headerNameKey ? headers[headerNameKey] : undefined;

    if (!csrfToken) {
        throw new Error("fetchApplicants: missing required 'x-csrf-token' header");
    }

    const cookieKey = Object.keys(headers).find((key) => key.toLowerCase() === "cookie");
    const existingCookie = cookieKey ? headers[cookieKey] : "";
    const cookie = existingCookie ? `${existingCookie}; csrfToken=${csrfToken}` : `csrfToken=${csrfToken}`;

    return { ...headers, [cookieKey ?? "cookie"]: cookie, "x-csrf-token": csrfToken };
}

/** "21/08/2026, 06:47 PM" (the listing's display format) → "2026-08-21"; "" when it doesn't match. */
export function parseListingDate(text: string): string {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(text.trim());
    if (!match) return "";
    const [, dd, mm, yyyy] = match;
    return `${yyyy ?? ""}-${mm ?? ""}-${dd ?? ""}`;
}

export function parseApplicants(html: string): Applicant[] {
    const $ = cheerio.load(`<table>${html}</table>`);

    $("script, style, form, svg").remove();

    const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();

    // Only the first page carries a `<thead>`; later pages are bare rows. When
    // a header is present it is trusted, otherwise the column sits where
    // `column_create_keys[]` in `buildRequestBody` put it.
    const headerIndex = $("thead th")
        .toArray()
        .findIndex((th) => clean($(th).text()).toLowerCase().startsWith("payment approved date"));
    const dateColumn = headerIndex === -1 ? DATE_CELL_INDEX : headerIndex;

    // htmlparser2 does not auto-insert `<tbody>` around bare `<tr>` rows the way
    // parse5 does, so match rows directly and drop header rows explicitly.
    return $("tr")
        .not("thead tr")
        .toArray()
        .map((tr) => {
            const $tr = $(tr);

            const [userId = "", formId = ""] = ($tr.find("input.select_application").attr("value") ?? "").split("_");

            const cells = $tr.find("td");
            const registeredNameCell = cells.eq(1);
            const applicationNoCell = cells.eq(2);
            const formNameCell = cells.eq(3);

            return {
                userId,
                formId,
                registeredName: clean(registeredNameCell.text()),
                applicationNumber: clean(applicationNoCell.attr("title") ?? applicationNoCell.text()),
                formName: clean(formNameCell.attr("title") ?? formNameCell.text()),
                paymentApprovedDate: parseListingDate(clean(cells.eq(dateColumn).text())),
            };
        })
        .filter((row) => row.userId !== "" || row.applicationNumber !== "");
}

/**
 * Columns to render, in order (`column_create_keys[]`). Cell 0 of every row is
 * the select checkbox, so column i lands in cell i + 1 — `parseApplicants`
 * relies on that for name/application/form (cells 1–3) and the date.
 */
const LISTING_COLUMNS = [
    "ud|name||Registered Name",
    "fd|application_no||Application No",
    "f|form_title||Form Name",
    "fd|form_status||Form Status",
    "ap|payment_status||Payment Status",
    "payment_approved_date||Payment Approved Date",
];
const DATE_CELL_INDEX = 1 + LISTING_COLUMNS.findIndex((c) => c.startsWith("payment_approved_date"));

export function buildRequestBody({
    from,
    to,
    counsellorId,
    csrfToken,
    page = 0,
    mode = "list",
}: {
    from: Date;
    to: Date;
    counsellorId: number;
    csrfToken: string;
    /** 0-based; the listing offset is `page * PAGE_SIZE`. Ignored for "count". */
    page?: number;
    /** "list" returns rows as HTML; "count" returns the bare total for the same filters. */
    mode?: "list" | "count";
}): string {
    const snapshotFormList = 1410;
    const checksum = "f9008bc4ece8c7931ce654299e9861df";

    function formatDate(d: Date) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString()}`;
    }

    function formatDateTime(d: Date, edge: "start" | "end") {
        return `${formatDate(d)} ${edge === "start" ? "12:00 AM" : "11:59 PM"}`;
    }

    const start = formatDateTime(from, "start");
    const end = formatDateTime(to, "end");

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
    set("search_by_field", "application_no");
    set("search_common", "");
    // Server fills this in on the first response; sending it empty is fine.
    set("all_records", "");
    set("per_page_record", PAGE_SIZE);
    set("snapshot_form_list", snapshotFormList);
    // Registration-date bound: fixed lower bound, upper bound = end of window.
    set("final_registration_date", `01/01/2017,${formatDate(to)}`);
    set("app_block_condition", "");
    set("s_college_id", 257);
    set("form_id", 0);

    // Advance filters: index 0 is the date window, index 1 the counsellor,
    // index 2 restricts to online payments (offline/cash/DD/voucher/free are
    // not counted as admissions).
    set("application_advance_filter[0][condition]", "and");
    set("application_advance_filter[0][0][fields]", "payment_approved_date||date||");
    set("application_advance_filter[0][0][types]", "between");
    set("application_advance_filter[0][0][values][]", `${start},${end}`);
    set("application_advance_filter[0][1][fields]", "councellor_id||dropdown||[]");
    set("application_advance_filter[0][1][types]", "eq");
    set("application_advance_filter[0][1][values][]", counsellorId);
    set(
        "application_advance_filter[0][2][fields]",
        'ap|payment_method||dropdown||{"offline":"Offline","cash":"Cash","dd":"DD","online":"Online","voucher":"Voucher","free":"Free"}',
    );
    set("application_advance_filter[0][2][types]", "eq");
    set("application_advance_filter[0][2][values][]", "online");

    set("daterangepicker_start", start);
    set("daterangepicker_end", end);
    set("module_filter", "am_filter_v2");
    set("ctype", "applications");
    set("fdid", 0);
    // Offset of the first row on this page.
    set("current_record", page * PAGE_SIZE);
    set("sort_options", "");
    set("realignment_order", "");
    set("checksum", checksum);
    if (mode === "count") {
        set("am_listing", 0);
        set("type", "total_record");
    } else {
        set("am_listing", 1);
    }
    set("page", page);
    // Columns to render, in order. Without these the server falls back to the
    // login's saved column set, which need not include "Payment Approved
    // Date" — the column that places each row on its day for a multi-day
    // window. (`realignment_order` alone does NOT select columns.)
    for (const column of LISTING_COLUMNS) params.append("column_create_keys[]", column);
    set("quick_filter[0][condition]", "and");
    set("quick_filter[0][0][fields]", "");
    set("quick_filter[0][0][types]", "");
    set("quick_filter[0][0][values][]", "");
    set("college_session_id", "");

    return params.toString();
}
