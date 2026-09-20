import { describe, test, expect } from "vitest";
import { parseApplicants, parseListingDate, buildRequestBody } from "@/utils/meritto/fetch-applicants";

const HTML = `
<thead><tr><th class="text-center"><input type="checkbox"></th><th><span></span>Registered Name   <span>x</span></th><th>Application No</th><th>Form Name</th><th>Form Status</th><th>Payment Status</th><th><span></span>Payment Approved Date  <span>y</span></th><th></th></tr></thead>
<tbody>
<tr><td><input value="16669084_17707" class="select_application" type="checkbox"></td><td><form>junk</form><a><span>Preetam&nbsp;Kumar</span></a></td><td>BU26BTCN1064369</td><td title="B.Tech CSE 2026"><div>B.Tech CSE 2026</div></td><td>Complete</td><td>Payment Approved</td><td>20/08/2026, 10:36 AM</td><td></td></tr>
<tr><td><input value="18360340_18931" class="select_application" type="checkbox"></td><td>Ankit</td><td>BU26BTECBN102691</td><td>Biotech</td><td>Complete</td><td>Payment Approved</td><td></td><td></td></tr>
</tbody>`;

describe("meritto/parseApplicants", () => {
    test("reads ids, text cells and the payment approved date column by header", () => {
        const rows = parseApplicants(HTML);
        expect(rows).toEqual([
            {
                userId: "16669084",
                formId: "17707",
                registeredName: "Preetam Kumar",
                applicationNumber: "BU26BTCN1064369",
                formName: "B.Tech CSE 2026",
                paymentApprovedDate: "2026-08-20",
            },
            {
                userId: "18360340",
                formId: "18931",
                registeredName: "Ankit",
                applicationNumber: "BU26BTECBN102691",
                formName: "Biotech",
                paymentApprovedDate: "",
            },
        ]);
    });

    test("no <thead> (pages after the first) → date read from the requested column position", () => {
        const rows = parseApplicants(HTML.replace(/<thead>[\s\S]*?<\/thead>/, ""));
        expect(rows.map((r) => r.paymentApprovedDate)).toEqual(["2026-08-20", ""]);
    });

    test("header present but date column elsewhere → header wins", () => {
        const moved = `<thead><tr><th></th><th>Registered Name</th><th>Application No</th><th>Form Name</th><th>Payment Approved Date</th></tr></thead>
<tr><td><input value="1_2" class="select_application"></td><td>N</td><td>APP</td><td>F</td><td>05/07/2026, 01:00 PM</td></tr>`;
        expect(parseApplicants(moved)[0]?.paymentApprovedDate).toBe("2026-07-05");
    });

    test("parseListingDate", () => {
        expect(parseListingDate("21/08/2026, 06:47 PM")).toBe("2026-08-21");
        expect(parseListingDate("")).toBe("");
        expect(parseListingDate("n/a")).toBe("");
    });

    test("request body: range window, online-only filter, date column requested, paging", () => {
        const body = buildRequestBody({
            from: new Date(2026, 7, 1),
            to: new Date(2026, 7, 31),
            counsellorId: 42,
            csrfToken: "tok",
            page: 2,
        });
        const p = new URLSearchParams(body);
        expect(p.get("application_advance_filter[0][0][values][]")).toBe("01/08/2026 12:00 AM,31/08/2026 11:59 PM");
        expect(p.get("application_advance_filter[0][1][values][]")).toBe("42");
        expect(p.get("application_advance_filter[0][2][fields]")).toMatch(/^ap\|payment_method\|\|dropdown/);
        expect(p.get("application_advance_filter[0][2][values][]")).toBe("online");
        expect(p.getAll("column_create_keys[]")).toContain("payment_approved_date||Payment Approved Date");
        expect(p.get("per_page_record")).toBe("100");
        expect(p.get("page")).toBe("2");
        expect(p.get("current_record")).toBe("200");
        expect(p.get("am_listing")).toBe("1");
        expect(p.get("type")).toBeNull();
    });

    test("request body: count mode asks for the bare total with the same filters", () => {
        const list = new URLSearchParams(buildRequestBody({ from: new Date(2026, 6, 1), to: new Date(2026, 6, 31), counsellorId: 7, csrfToken: "t" }));
        const count = new URLSearchParams(buildRequestBody({ from: new Date(2026, 6, 1), to: new Date(2026, 6, 31), counsellorId: 7, csrfToken: "t", mode: "count" }));
        expect(count.get("am_listing")).toBe("0");
        expect(count.get("type")).toBe("total_record");
        for (const key of ["application_advance_filter[0][0][values][]", "application_advance_filter[0][1][values][]", "application_advance_filter[0][2][values][]"]) {
            expect(count.get(key)).toBe(list.get(key));
        }
    });
});
