import type { CanonicalField } from "./aliases";
import { HEADER_ALIASES, normalizeHeaderKey } from "./aliases";

export type ColumnMap = Partial<Record<CanonicalField, number>>;

export interface ColumnMapResult {
    columns: ColumnMap;
    /** Offsets (within the header span) that didn't match any known alias. */
    unmapped: number[];
    /** Required fields (`name`, `target`) absent from the header entirely. */
    requiredMissing: CanonicalField[];
}

const REQUIRED_FIELDS: readonly CanonicalField[] = ["name", "target"];

/** Stage 4 (PLAN.md §4) — header cells → canonical fields, by name, never by index. */
export function mapColumns(headerCells: readonly unknown[]): ColumnMapResult {
    const columns: ColumnMap = {};
    const unmapped: number[] = [];

    for (let offset = 0; offset < headerCells.length; offset++) {
        const key = normalizeHeaderKey(headerCells[offset]);
        if (!key) continue;
        const field = HEADER_ALIASES[key];
        if (!field) {
            unmapped.push(offset);
            continue;
        }
        columns[field] ??= offset;
    }

    const requiredMissing = REQUIRED_FIELDS.filter((field) => columns[field] === undefined);

    return { columns, unmapped, requiredMissing };
}
