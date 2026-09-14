import { describe, expect, it } from "vitest";
import { bigramDice, normalizeText, rankCandidates, similarity } from "@/lib/matching/similarity";

describe("normalizeText", () => {
    it("lower-cases, strips punctuation and collapses whitespace", () => {
        expect(normalizeText("  Media & Liberal-Arts  ")).toBe("media liberal arts");
        expect(normalizeText("Média/Liberal")).toBe("media liberal");
    });
});

describe("bigramDice", () => {
    it("is 1 for identical non-empty strings and 0 for disjoint ones", () => {
        expect(bigramDice("sumitra", "sumitra")).toBe(1);
        expect(bigramDice("abc", "xyz")).toBe(0);
        expect(bigramDice("", "")).toBe(0);
    });
});

describe("similarity", () => {
    it("ignores case, punctuation and token order", () => {
        expect(similarity("Hemant singh", "HEMANT SINGH")).toBe(1);
        expect(similarity("Singh, Hemant", "Hemant Singh")).toBe(1);
    });

    it("scores a one-letter typo as a near-certain match", () => {
        expect(similarity("Vishwadep Saxena", "Vishwadeep Saxena")).toBeGreaterThanOrEqual(0.9);
        expect(similarity("Shalini Panjiyar", "Shalini Paniyar")).toBeGreaterThanOrEqual(0.9);
    });

    it("scores a dropped surname as a suggestion, not a certainty", () => {
        const score = similarity("Sumitra", "Sumitra Bharti");
        expect(score).toBeGreaterThanOrEqual(0.5);
        expect(score).toBeLessThan(0.9);
    });

    it("keeps different people who share a first name well apart", () => {
        expect(similarity("Sneha Gupta", "Sneha Kumari")).toBeLessThan(0.7);
        expect(similarity("Shalini Kumari", "Shalini Panjiyar")).toBeLessThan(0.7);
        expect(similarity("Abhishek Kumar", "Abhinav Kumar")).toBeLessThan(0.85);
    });

    it("scores a respelled name as a suggestion", () => {
        const score = similarity("Akansha sanger", "Akanksha Sengar");
        expect(score).toBeGreaterThanOrEqual(0.6);
        expect(score).toBeLessThan(0.9);
    });

    it("scores unrelated names near zero", () => {
        expect(similarity("Palki Mittal", "Bashar Nasir")).toBeLessThan(0.3);
    });
});

describe("rankCandidates", () => {
    it("returns candidates above the floor, best first", () => {
        const roster = ["Sneha Gupta", "Sneha Kumari", "Sumitra", "Bashar Nasir"];
        const ranked = rankCandidates("Sneha Gupta", roster, (n) => n, 0.4);
        expect(ranked.map((r) => r.candidate)).toEqual(["Sneha Gupta", "Sneha Kumari"]);
        expect(ranked[0]?.score).toBe(1);
    });
});
