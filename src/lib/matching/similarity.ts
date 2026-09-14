/**
 * Fuzzy string matching for the workbook import (names, team sheet names,
 * agency names). Pure functions, no DB, shared by the server-side plan
 * builder and the client-side review screen.
 *
 * The score is `max(bigram Dice, edit-distance ratio, token alignment)`:
 *
 *   - Dice on character bigrams catches transpositions and respellings
 *     ("Akansha sanger" vs "Akanksha Sengar").
 *   - The Levenshtein ratio (1 - distance / length) catches a single dropped
 *     or doubled letter, which Dice punishes twice ("Panjiyar" vs "Paniyar").
 *   - Token alignment catches a dropped or extra name part ("Sumitra" vs
 *     "Sumitra Bharti"): every token of the shorter name is matched to its
 *     best token in the longer name, and the average is scaled by how much of
 *     the longer name was covered, so "Kumar" alone never claims "Abhishek
 *     Kumar" outright.
 *
 * Scores are in [0, 1]; 1 means the normalised strings are identical.
 */

/** Lower-case, strip diacritics, collapse every run of non-alphanumerics to one space. */
export function normalizeText(text: string): string {
    return text
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

export function tokenize(text: string): string[] {
    const normalized = normalizeText(text);
    return normalized === "" ? [] : normalized.split(" ");
}

function bigrams(text: string): Map<string, number> {
    const out = new Map<string, number>();
    if (text.length < 2) {
        if (text.length === 1) out.set(text, 1);
        return out;
    }
    for (let i = 0; i < text.length - 1; i++) {
        const gram = text.slice(i, i + 2);
        out.set(gram, (out.get(gram) ?? 0) + 1);
    }
    return out;
}

/** Sørensen–Dice coefficient over character bigrams of two already-normalised strings. */
export function bigramDice(a: string, b: string): number {
    if (a === b) return a === "" ? 0 : 1;
    if (a === "" || b === "") return 0;
    const ga = bigrams(a);
    const gb = bigrams(b);
    let common = 0;
    let totalA = 0;
    let totalB = 0;
    for (const n of ga.values()) totalA += n;
    for (const n of gb.values()) totalB += n;
    for (const [gram, n] of ga) {
        const m = gb.get(gram);
        if (m !== undefined) common += Math.min(n, m);
    }
    return (2 * common) / (totalA + totalB);
}

/** 1 - (Levenshtein distance / longer length), on already-normalised strings. */
export function editRatio(a: string, b: string): number {
    if (a === b) return a === "" ? 0 : 1;
    if (a === "" || b === "") return 0;
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost));
        }
        previous = current;
    }
    return 1 - (previous[b.length] ?? 0) / Math.max(a.length, b.length);
}

/**
 * Token alignment: each token of the shorter side takes its best Dice match
 * on the longer side, averaged, then scaled by `sqrt(shorter / longer)` so
 * a one-token name matching one token of a three-token name scores well
 * below an outright match.
 */
function tokenAlignment(a: string[], b: string[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
    let sum = 0;
    for (const token of shorter) {
        let best = 0;
        for (const other of longer) {
            const score = bigramDice(token, other);
            if (score > best) best = score;
        }
        sum += best;
    }
    const average = sum / shorter.length;
    return average * Math.sqrt(shorter.length / longer.length);
}

/** Similarity of two free-text values in [0, 1]. Order-insensitive at the token level. */
export function similarity(a: string, b: string): number {
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);
    const joinedA = tokensA.join("");
    const joinedB = tokensB.join("");
    if (joinedA === "" || joinedB === "") return 0;
    if (joinedA === joinedB) return 1;
    const sortedDice = bigramDice([...tokensA].sort().join(""), [...tokensB].sort().join(""));
    return Math.max(
        bigramDice(joinedA, joinedB),
        editRatio(joinedA, joinedB),
        sortedDice,
        tokenAlignment(tokensA, tokensB),
    );
}

export interface ScoredCandidate<T> {
    candidate: T;
    score: number;
}

/**
 * Every candidate scoring at least `minScore` against `query`, best first.
 * Ties keep the input order so a caller's own preference (e.g. same team
 * first) survives.
 */
export function rankCandidates<T>(
    query: string,
    candidates: readonly T[],
    label: (candidate: T) => string,
    minScore: number,
): ScoredCandidate<T>[] {
    const scored: ScoredCandidate<T>[] = [];
    for (const candidate of candidates) {
        const score = similarity(query, label(candidate));
        if (score >= minScore) scored.push({ candidate, score });
    }
    return scored.sort((x, y) => y.score - x.score);
}
