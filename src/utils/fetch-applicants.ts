import * as cheerio from "cheerio";

/**
 * One row of the application-manager list, trimmed to the fields we care
 * about. The endpoint's response carries far more (payment status, form
 * status, masked email/mobile, per-row action menus) — everything else is
 * dropped here.
 */
export interface Applicant {
    userId: string;
    formId: string;
    registeredName: string;
    applicationNo: string;
    formName: string;
}

export interface FetchApplicantsInput {
    /** Full URL of the `ajax-lists` endpoint. */
    url: string;
    /** Request headers — must include `cookie` and `x-csrf-token` for a live session. */
    headers: Record<string, string>;
    /** Urlencoded request body (see `buildApplicantsListBody` in this module, or build it yourself). */
    body: string;
}

/**
 * Fetches one page of the counsellor application-manager list and parses it
 * into a plain array of applicants.
 *
 * The endpoint returns a bare `<thead>…</thead><tbody>…</tbody>` HTML
 * fragment (no `<table>` wrapper), with each `<td>` containing a nested
 * `<form>` full of hidden JSON inputs plus icon SVGs — those are stripped
 * before reading cell text. Truncated cell text (e.g. "B.Tech Computer
 * Science an...") is recovered from the `<td title="...">` attribute.
 */
export async function fetchApplicants({ url, headers, body }: FetchApplicantsInput): Promise<Applicant[]> {
    const response = await fetch(url, { method: "POST", headers, body });

    if (!response.ok) {
        throw new Error(`fetchApplicants: request failed with status ${response.status.toString()}`);
    }

    const html = await response.text();
    return parseApplicants(html);
}

/** Parses the raw `ajax-lists` HTML fragment into applicant rows. */
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
                applicationNo: clean(applicationNoCell.attr("title") || applicationNoCell.text()),
                formName: clean(formNameCell.attr("title") || formNameCell.text()),
            };
        })
        .filter((row) => row.userId !== "" || row.applicationNo !== "");
}
