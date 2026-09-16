import { describe, expect, it } from "vitest";
import { formatSessionSpan, sessionMonths, sessionOfMonth } from "@/schemas/dates";

describe("sessionOfMonth", () => {
    it("rolls October–December into the next calendar year's session", () => {
        expect(sessionOfMonth("2026-10")).toBe("2027");
        expect(sessionOfMonth("2026-11")).toBe("2027");
        expect(sessionOfMonth("2026-12")).toBe("2027");
    });

    it("keeps January–September in the same calendar year's session", () => {
        expect(sessionOfMonth("2027-01")).toBe("2027");
        expect(sessionOfMonth("2027-09")).toBe("2027");
        expect(sessionOfMonth("2026-09")).toBe("2026");
    });
});

describe("sessionMonths", () => {
    it("lists Oct of the previous year through Sep of the session year", () => {
        const months = sessionMonths("2027");
        expect(months).toHaveLength(12);
        expect(months[0]).toBe("2026-10");
        expect(months[2]).toBe("2026-12");
        expect(months[3]).toBe("2027-01");
        expect(months[11]).toBe("2027-09");
        expect(months.every((m) => sessionOfMonth(m) === "2027")).toBe(true);
    });
});

describe("formatSessionSpan", () => {
    it("spells out the calendar span", () => {
        expect(formatSessionSpan("2027")).toBe("Oct 2026 – Sep 2027");
    });
});
