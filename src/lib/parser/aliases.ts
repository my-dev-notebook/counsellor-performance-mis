/**
 * Canonical field alias map (PLAN.md §2.3). Column order and exact header
 * text are not stable across months — header cells are matched by a
 * normalized name, never by index.
 */
export type CanonicalField =
    | "name"
    | "agency"
    | "doj"
    | "email"
    | "target"
    | "nonNegotiable"
    | "acknowledgment"
    | "achieved"
    | "feedback"
    | "serial"
    | "pending"
    | "pctAchieved"
    | "team";

/** Fields whose value is fundamentally numeric — used by the total-row heuristic (§4 stage 3). */
export const NUMERIC_FIELDS: ReadonlySet<CanonicalField> = new Set([
    "target",
    "nonNegotiable",
    "achieved",
    "pending",
    "pctAchieved",
    "serial",
]);

/** Header key → canonical field. Keys are pre-normalized via `normalizeHeaderKey`. */
export const HEADER_ALIASES: Readonly<Record<string, CanonicalField>> = {
    counsellorname: "name",
    agencyname: "agency",
    doj: "doj",
    emailid: "email",
    overall: "target",
    target: "target",
    "non-negotiable": "nonNegotiable",
    "0.9": "nonNegotiable",
    acknowledgment: "acknowledgment",
    achieved: "achieved",
    feedback: "feedback",
    "s.no": "serial",
    pending: "pending",
    "%achieved": "pctAchieved",
    teamname: "team",
};

/**
 * Case-insensitive, whitespace/punctuation-insensitive header matching
 * (`% Achieved` vs `%Achieved`, `Acknowledgment ` vs `Acknowledgment`).
 * Unwraps exceljs's rich-text / hyperlink / formula cell shapes first, since
 * a header cell can itself be a formula result (June's `0.9` column header
 * is a bare number, not a string).
 */
export function normalizeHeaderKey(raw: unknown): string | null {
    if (raw === null || raw === undefined) return null;

    let text: string;
    if (typeof raw === "string") {
        text = raw;
    } else if (typeof raw === "number" || typeof raw === "boolean") {
        text = String(raw);
    } else if (raw instanceof Date) {
        text = raw.toISOString();
    } else if (typeof raw === "object") {
        if ("richText" in raw && Array.isArray(raw.richText)) {
            text = (raw.richText as { text: string }[]).map((part) => part.text).join("");
        } else if ("result" in raw) {
            return normalizeHeaderKey(raw.result);
        } else if ("text" in raw) {
            text = typeof raw.text === "string" ? raw.text : "";
        } else {
            return null;
        }
    } else {
        return null;
    }

    const trimmed = text.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase().replace(/\s+/g, "");
}
