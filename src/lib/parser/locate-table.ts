import { HEADER_ALIASES, normalizeHeaderKey } from "./aliases";
import { isEmptyCell } from "./coerce";
import type { ColumnMap } from "./map-columns";
import type { RawGrid } from "./read";

const HEADER_SCAN_LIMIT = 15;
const HEADER_SCORE_THRESHOLD = 2;

export interface HeaderLocation {
    /** 0-based index into the grid; the corresponding Excel row is `headerRowIndex + 1`. */
    headerRowIndex: number;
    colStart: number;
    colEnd: number;
    headerCells: readonly unknown[];
}

function scoreRow(row: readonly unknown[]): number {
    let score = 0;
    for (const cell of row) {
        const key = normalizeHeaderKey(cell);
        if (key && key in HEADER_ALIASES) score++;
    }
    return score;
}

/** Stage 3, part 1 (PLAN.md §4) — the header is not assumed to be row 1; it is scored and found. */
export function locateHeaderRow(grid: RawGrid): HeaderLocation | null {
    const scanLimit = Math.min(grid.length, HEADER_SCAN_LIMIT);
    let best: { index: number; score: number } | null = null;

    for (let i = 0; i < scanLimit; i++) {
        const row = grid[i] ?? [];
        const score = scoreRow(row);
        if (score >= HEADER_SCORE_THRESHOLD && (!best || score > best.score)) {
            best = { index: i, score };
        }
    }
    if (!best) return null;

    const row = grid[best.index] ?? [];
    let colStart = -1;
    let colEnd = -1;
    for (let c = 0; c < row.length; c++) {
        if (normalizeHeaderKey(row[c])) {
            if (colStart === -1) colStart = c;
            colEnd = c;
        }
    }
    if (colStart === -1) return null;

    return {
        headerRowIndex: best.index,
        colStart,
        colEnd,
        headerCells: row.slice(colStart, colEnd + 1),
    };
}

export interface BodyRow {
    excelRow: number;
    cells: readonly unknown[];
}

export interface TableExtraction {
    bodyRows: BodyRow[];
    declaredTotalRow?: BodyRow;
}

const TOTAL_LABEL_RE = /^(grand\s*)?total\b/i;

function sliceToSpan(row: readonly unknown[], header: HeaderLocation): readonly unknown[] {
    return row.slice(header.colStart, header.colEnd + 1);
}

function rowIsBlank(cells: readonly unknown[]): boolean {
    return cells.every((cell) => isEmptyCell(cell));
}

/**
 * Stage 3, part 2 — the table body, ending at the first true blank row (with
 * a 2-row lookahead so a merged gap doesn't truncate the table early) or a
 * total row: a `Grand Total`-labelled row, or an unlabelled row of numbers
 * (July's style) — all numeric columns populated while the name column is
 * blank. May has neither and simply runs out of rows.
 */
export function extractTableBody(grid: RawGrid, header: HeaderLocation, columns: ColumnMap): TableExtraction {
    const bodyRows: BodyRow[] = [];
    let declaredTotalRow: BodyRow | undefined;

    let i = header.headerRowIndex + 1;
    while (i < grid.length) {
        const cells = sliceToSpan(grid[i] ?? [], header);

        if (rowIsBlank(cells)) {
            const next1 = grid[i + 1];
            const next2 = grid[i + 2];
            const next1Blank = !next1 || rowIsBlank(sliceToSpan(next1, header));
            const next2Blank = !next2 || rowIsBlank(sliceToSpan(next2, header));
            if (next1Blank && next2Blank) break;
            i++;
            continue;
        }

        const nameCell = columns.name !== undefined ? cells[columns.name] : undefined;
        const nameText = typeof nameCell === "string" ? nameCell.trim() : null;
        const nameIsTotalLabel = nameText !== null && TOTAL_LABEL_RE.test(nameText);

        const targetCell = columns.target !== undefined ? cells[columns.target] : undefined;
        const targetLooksNumeric =
            typeof targetCell === "number" ||
            (typeof targetCell === "object" &&
                targetCell !== null &&
                ("formula" in targetCell || "sharedFormula" in targetCell));
        const nameIsBlank = nameCell === undefined || isEmptyCell(nameCell);

        if (nameIsTotalLabel || (nameIsBlank && targetLooksNumeric)) {
            declaredTotalRow = { excelRow: i + 1, cells };
            break;
        }

        bodyRows.push({ excelRow: i + 1, cells });
        i++;
    }

    return declaredTotalRow ? { bodyRows, declaredTotalRow } : { bodyRows };
}
