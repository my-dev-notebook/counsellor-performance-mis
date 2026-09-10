import * as cheerio from "cheerio";

export interface Applicant {
    userId: string;
    formId: string;
    registeredName: string;
    applicationNumber: string;
    formName: string;
}

export async function fetchApplicants({ url, headers, date, counsellorId }: {
    url: string;
    headers: Record<string, string>;
    date: Date
    counsellorId: string;
}): Promise<Applicant[]> {

    const headersWithCsrfToken = withCsrfToken(headers);
    const csrfToken = headersWithCsrfToken["x-csrf-token"];

    const body = buildRequestBody({ date, counsellorId, csrfToken });

    const response = await fetch(url, { method: "POST", headers: headersWithCsrfToken, body });

    if (!response.ok) {
        throw new Error(`fetchApplicants: request failed with status ${response.status.toString()}`);
    }

    const html = await response.text();
    return parseApplicants(html);
}

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

export function parseApplicants(html: string): Applicant[] {
    const $ = cheerio.load(`<table>${html}</table>`);

    $("script, style, form, svg").remove();

    const clean = (s: string) => s.replace(/ /g, " ").replace(/\s+/g, " ").trim();

    return $("tbody tr")
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
            };
        })
        .filter((row) => row.userId !== "" || row.applicationNumber !== "");
}

export function buildRequestBody({ date, counsellorId, csrfToken }: { date: Date, counsellorId: string; csrfToken: string; }): string {
    const snapshotFormList = 1410;
    const checksum = "f9008bc4ece8c7931ce654299e9861df";

    function formatDate(d: Date) {
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear().toString()}`;
    }

    function formatDateTime(d: Date, edge: "start" | "end") {
        return `${formatDate(d)} ${edge === "start" ? "12:00 AM" : "11:59 PM"}`;
    }

    const start = formatDateTime(date, "start");
    const end = formatDateTime(date, "end");

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
    set("per_page_record", 1000);
    set("snapshot_form_list", snapshotFormList);
    // Registration-date bound: fixed lower bound, upper bound = end of window.
    set("final_registration_date", `01/01/2017,${formatDate(date)}`);
    set("app_block_condition", "");
    set("s_college_id", 257);
    set("form_id", 0);

    // Advance filters: index 0 is the date window, index 1 the counsellor.
    set("application_advance_filter[0][condition]", "and");
    set("application_advance_filter[0][0][fields]", "payment_approved_date||date||");
    set("application_advance_filter[0][0][types]", "between");
    set("application_advance_filter[0][0][values][]", `${start},${end}`);
    set("application_advance_filter[0][1][fields]", "councellor_id||dropdown||[]");
    set("application_advance_filter[0][1][types]", "eq");
    set("application_advance_filter[0][1][values][]", counsellorId);

    set("daterangepicker_start", start);
    set("daterangepicker_end", end);
    set("module_filter", "am_filter_v2");
    set("ctype", "applications");
    set("fdid", 0);
    set("current_record", "");
    set("sort_options", "");
    set("realignment_order", "");
    set("checksum", checksum);
    set("am_listing", 1);
    set("page", 0);
    set("quick_filter[0][condition]", "and");
    set("quick_filter[0][0][fields]", "");
    set("quick_filter[0][0][types]", "");
    set("quick_filter[0][0][values][]", "");
    set("college_session_id", "");

    return params.toString();
}
