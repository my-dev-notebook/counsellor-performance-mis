import { describe, expect, it } from "vitest";
import { deriveStatus } from "@/lib/metrics/buckets";
import { deriveBelowNonNegotiable, derivePctAchieved, derivePending, deriveTargetGap } from "@/lib/metrics/derive";

describe("derivePending", () => {
    it("is target - achieved regardless of the sheet's own sign convention", () => {
        expect(derivePending(100, 70)).toBe(30);
        expect(derivePending(70, 100)).toBe(-30);
    });
    it("is null when either side is missing", () => {
        expect(derivePending(null, 70)).toBeNull();
        expect(derivePending(100, null)).toBeNull();
    });
});

describe("derivePctAchieved", () => {
    it("divides achieved by target", () => {
        expect(derivePctAchieved(200, 218)).toBeCloseTo(1.09, 5);
    });
    it("is null for a zero or missing target, never a divide-by-zero", () => {
        expect(derivePctAchieved(0, 10)).toBeNull();
        expect(derivePctAchieved(null, 10)).toBeNull();
        expect(derivePctAchieved(10, null)).toBeNull();
    });
});

describe("deriveTargetGap", () => {
    it("clamps negative pending (over-achievement) to 0", () => {
        expect(deriveTargetGap(-30)).toBe(0);
    });
    it("passes positive pending through", () => {
        expect(deriveTargetGap(30)).toBe(30);
    });
    it("is 0, not null, when pending is unknown (so team sums stay numeric)", () => {
        expect(deriveTargetGap(null)).toBe(0);
    });
});

describe("deriveBelowNonNegotiable", () => {
    it("is true when achieved is under the personal floor", () => {
        expect(deriveBelowNonNegotiable(40, 35)).toBe(true);
    });
    it("is false when achieved meets or exceeds the floor", () => {
        expect(deriveBelowNonNegotiable(40, 40)).toBe(false);
    });
    it("is null when there is no non-negotiable to compare against (May)", () => {
        expect(deriveBelowNonNegotiable(null, 35)).toBeNull();
    });
});

describe("deriveStatus", () => {
    it("bands at 90/60 (ANS.md Q6)", () => {
        expect(deriveStatus(0.9)).toBe("Green");
        expect(deriveStatus(0.95)).toBe("Green");
        expect(deriveStatus(0.6)).toBe("Yellow");
        expect(deriveStatus(0.89)).toBe("Yellow");
        expect(deriveStatus(0.59)).toBe("Red");
        expect(deriveStatus(0)).toBe("Red");
    });
    it("is Unknown, never folded into Red, when there is no target", () => {
        expect(deriveStatus(null)).toBe("Unknown");
    });
});
