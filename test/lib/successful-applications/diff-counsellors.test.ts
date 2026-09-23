import { describe, test, expect } from "vitest";
import { diffCounsellors, findDuplicateOwnership } from "@/lib/successful-applications/diff";
import type { ExistingSuccessfulApplication, FetchedSuccessfulApplication } from "@/lib/successful-applications/diff";
import type { SuccessfulApplicationRecord } from "@/schemas/successful-applications";

const rec = (n: string, extra: Partial<SuccessfulApplicationRecord> = {}): SuccessfulApplicationRecord => ({
    applicationNumber: n,
    applicantUserId: 1,
    applicantName: "A",
    formId: 2,
    formName: "F",
    ...extra,
});
const fetched = (date: string, n: string): FetchedSuccessfulApplication => ({ date, record: rec(n) });
const existing = (userId: number, date: string, n: string): ExistingSuccessfulApplication => ({
    userId,
    userName: `U${String(userId)}`,
    date,
    record: rec(n),
});

const MONTH = "2026-08";

describe("findDuplicateOwnership", () => {
    test("lists applications fetched under two counsellors, with the DB owner", () => {
        const dups = findDuplicateOwnership(
            new Map([
                [1, [fetched("2026-08-20", "dup"), fetched("2026-08-20", "only1")]],
                [2, [fetched("2026-08-21", "dup")]],
            ]),
            [existing(2, "2026-08-21", "dup")],
        );
        expect(dups).toHaveLength(1);
        expect(dups[0]?.applicationNumber).toBe("dup");
        expect(dups[0]?.claims.map((c) => c.userId)).toEqual([1, 2]);
        expect(dups[0]?.existing?.userId).toBe(2);
    });
});

describe("diffCounsellors", () => {
    test("diffs each counsellor against their own month rows", () => {
        const diffs = diffCounsellors({
            monthDate: MONTH,
            fetchedByUser: new Map([
                [1, [fetched("2026-08-20", "a"), fetched("2026-08-20", "new")]],
                [2, [fetched("2026-08-20", "b")]],
            ]),
            existing: [existing(1, "2026-08-20", "a"), existing(1, "2026-08-20", "gone"), existing(2, "2026-08-20", "b")],
            resolutions: new Map(),
        });
        const one = diffs.get(1);
        expect(one?.days).toHaveLength(1);
        expect(one?.days[0]?.added.map((r) => r.applicationNumber)).toEqual(["new"]);
        expect(one?.days[0]?.removed.map((r) => r.applicationNumber)).toEqual(["gone"]);
        expect(diffs.get(2)?.days).toEqual([]);
    });

    test("unresolved duplicates are dropped from every claimant; a resolved one goes to the pick", () => {
        const fetchedByUser = new Map([
            [1, [fetched("2026-08-20", "dup")]],
            [2, [fetched("2026-08-20", "dup")]],
        ]);
        const none = diffCounsellors({ monthDate: MONTH, fetchedByUser, existing: [], resolutions: new Map([["dup", null]]) });
        expect(none.get(1)?.days).toEqual([]);
        expect(none.get(2)?.days).toEqual([]);

        const picked = diffCounsellors({ monthDate: MONTH, fetchedByUser, existing: [], resolutions: new Map([["dup", 2]]) });
        expect(picked.get(1)?.days).toEqual([]);
        expect(picked.get(2)?.days[0]?.added.map((r) => r.applicationNumber)).toEqual(["dup"]);
    });

    test("a row the DB holds under another fetched counsellor is a move, not a conflict", () => {
        const diffs = diffCounsellors({
            monthDate: MONTH,
            fetchedByUser: new Map([
                [1, []],
                [2, [fetched("2026-08-21", "m")]],
            ]),
            existing: [existing(1, "2026-08-20", "m")],
            resolutions: new Map(),
        });
        const receiver = diffs.get(2);
        expect(receiver?.conflicts).toEqual([]);
        expect(receiver?.movedIn.map((m) => [m.applicationNumber, m.fromUserId, m.fromDate])).toEqual([["m", 1, "2026-08-20"]]);
        expect(receiver?.days[0]?.added.map((r) => r.applicationNumber)).toEqual(["m"]);
        const giver = diffs.get(1);
        expect(giver?.movedOut.map((m) => m.toUserId)).toEqual([2]);
        expect(giver?.days[0]?.removed.map((r) => r.applicationNumber)).toEqual(["m"]);
    });

    test("a row held by someone not fetched, or on another month, is a conflict", () => {
        const diffs = diffCounsellors({
            monthDate: MONTH,
            fetchedByUser: new Map([[1, [fetched("2026-08-20", "theirs"), fetched("2026-08-20", "old")]]]),
            existing: [existing(9, "2026-08-20", "theirs"), existing(1, "2026-07-31", "old")],
            resolutions: new Map(),
        });
        const one = diffs.get(1);
        expect(one?.days).toEqual([]);
        expect(one?.conflicts.map((c) => [c.record.applicationNumber, c.ownerName, c.ownerDate])).toEqual([
            ["theirs", "U9", "2026-08-20"],
            ["old", "U1", "2026-07-31"],
        ]);
        expect(one?.fetchedCount).toBe(2);
    });
});
