/**
 * Stage 5 coercion helpers (PLAN.md §2.6, §4, §7). `exceljs` cell values are
 * a wide union — string, number, boolean, `Date`, rich text, hyperlink,
 * formula (cached result or none), Excel error — so every read goes through
 * `unwrapCell` first, then a type-specific coercion that degrades to `null`
 * plus an `issue` code rather than throwing (§7 "degrade, never fail").
 */

export type CellIssue = "NO_CACHED_VALUE" | "EXCEL_ERROR" | "JUNK_VALUE" | "INVALID_NUMBER" | "INVALID_DATE";

export type Primitive = string | number | boolean | Date;

export interface UnwrapResult {
    value: Primitive | null;
    issue?: CellIssue;
}

const JUNK_STRINGS = new Set(["_", "na", "n/a", "-", ""]);

/** Collapses exceljs's `CellValue` union down to a primitive or `null`, one level at a time. */
export function unwrapCell(raw: unknown): UnwrapResult {
    if (raw === null || raw === undefined) return { value: null };
    if (raw instanceof Date) return { value: raw };
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
        return { value: raw };
    }
    if (typeof raw === "object") {
        if ("richText" in raw && Array.isArray(raw.richText)) {
            const text = (raw as { richText: { text: string }[] }).richText.map((part) => part.text).join("");
            return { value: text };
        }
        if ("error" in raw) return { value: null, issue: "EXCEL_ERROR" };
        if ("formula" in raw || "sharedFormula" in raw) {
            const result = (raw as { result?: unknown }).result;
            if (result === undefined) return { value: null, issue: "NO_CACHED_VALUE" };
            return unwrapCell(result);
        }
        if ("text" in raw) return { value: String(raw.text) };
    }
    return { value: null };
}

export interface CoerceResult<T> {
    value: T | null;
    issue?: CellIssue;
}

export function toNumber(raw: unknown): CoerceResult<number> {
    const { value, issue } = unwrapCell(raw);
    if (issue) return { value: null, issue };
    if (value === null) return { value: null };
    if (typeof value === "number") {
        return Number.isFinite(value) ? { value } : { value: null, issue: "INVALID_NUMBER" };
    }
    if (typeof value === "boolean" || value instanceof Date) {
        return { value: null, issue: "INVALID_NUMBER" };
    }
    const trimmed = value.trim();
    if (JUNK_STRINGS.has(trimmed.toLowerCase())) return { value: null, issue: "JUNK_VALUE" };
    const cleaned = trimmed.replace(/[%,₹$\s]/g, "");
    if (cleaned === "") return { value: null };
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? { value: parsed } : { value: null, issue: "INVALID_NUMBER" };
}

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toDate(raw: unknown): CoerceResult<Date> {
    const { value, issue } = unwrapCell(raw);
    if (issue) return { value: null, issue };
    if (value === null) return { value: null };
    if (value instanceof Date) return { value };
    if (typeof value === "number") {
        return { value: new Date(EXCEL_EPOCH_MS + value * MS_PER_DAY) };
    }
    if (typeof value === "boolean") return { value: null, issue: "INVALID_DATE" };
    const trimmed = value.trim();
    if (trimmed === "" || JUNK_STRINGS.has(trimmed.toLowerCase())) return { value: null };
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? { value: null, issue: "INVALID_DATE" } : { value: parsed };
}

export function toStringOrNull(raw: unknown): CoerceResult<string> {
    const { value, issue } = unwrapCell(raw);
    if (issue) return { value: null, issue };
    if (value === null) return { value: null };
    const text = value instanceof Date ? value.toISOString() : String(value).trim();
    if (text === "" || JUNK_STRINGS.has(text.toLowerCase())) return { value: null };
    return { value: text };
}

export function toBoolean(raw: unknown): CoerceResult<boolean> {
    const { value, issue } = unwrapCell(raw);
    if (issue) return { value: null, issue };
    if (value === null) return { value: null };
    if (typeof value === "boolean") return { value };
    const text = String(value).trim().toLowerCase();
    if (text === "" || JUNK_STRINGS.has(text)) return { value: null };
    if (["yes", "y", "true", "done"].includes(text)) return { value: true };
    if (["no", "n", "false"].includes(text)) return { value: false };
    return { value: null };
}

export function isEmptyCell(raw: unknown): boolean {
    const { value } = unwrapCell(raw);
    if (value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
}
