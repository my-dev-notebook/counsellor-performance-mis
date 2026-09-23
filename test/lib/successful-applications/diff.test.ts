import { describe, test, expect } from "vitest";
import { diffDay, diffDays, hasChanges } from "@/lib/successful-applications/diff";
import type { SuccessfulApplicationRecord } from "@/schemas/successful-applications";

const rec = (n: string, extra: Partial<SuccessfulApplicationRecord> = {}): SuccessfulApplicationRecord => ({
    applicationNumber: n,
    applicantUserId: 1,
    applicantName: "A",
    formId: 2,
    formName: "F",
    ...extra,
});

describe("successful-applications/diff", () => {
    test("classifies added, changed, removed, unchanged by application number", () => {
        const d = diffDay(
            "2026-08-20",
            [rec("keep"), rec("gone"), rec("edit", { applicantName: "Old" })],
            [rec("keep"), rec("new"), rec("edit", { applicantName: "New" })],
        );
        expect(d.added.map((r) => r.applicationNumber)).toEqual(["new"]);
        expect(d.removed.map((r) => r.applicationNumber)).toEqual(["gone"]);
        expect(d.changed).toEqual([{ before: rec("edit", { applicantName: "Old" }), after: rec("edit", { applicantName: "New" }) }]);
        expect(d.unchanged).toBe(1);
        expect(d.fetched).toHaveLength(3);
        expect(hasChanges(d)).toBe(true);
    });

    test("identical sides have no changes", () => {
        const d = diffDay("2026-08-20", [rec("a")], [rec("a")]);
        expect(hasChanges(d)).toBe(false);
        expect(d.unchanged).toBe(1);
    });

    test("diffDays covers the union of dates in order; a move shows on both days", () => {
        const days = diffDays(
            new Map([["2026-08-05", [rec("x")]]]),
            new Map([["2026-08-06", [rec("x")]], ["2026-08-01", [rec("y")]]]),
        );
        expect(days.map((d) => d.date)).toEqual(["2026-08-01", "2026-08-05", "2026-08-06"]);
        expect(days[1]?.removed).toHaveLength(1);
        expect(days[2]?.added).toHaveLength(1);
    });
});
