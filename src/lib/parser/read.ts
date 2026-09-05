import ExcelJS from "exceljs";
import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";
import type { ParseError } from "./errors";

/**
 * A worksheet reduced to a plain, 1-indexed-by-position cell grid:
 * `grid[0]` is Excel row 1. Formula objects, hyperlinks, rich text and
 * dates are preserved as `exceljs` returns them — coercion happens in
 * `coerce.ts`, not here.
 */
export type RawGrid = readonly (readonly ExcelJS.CellValue[])[];

export interface RawSheet {
  name: string;
  grid: RawGrid;
}
export interface RawWorkbook {
  sheets: readonly RawSheet[];
}

function sheetToGrid(sheet: ExcelJS.Worksheet): RawGrid {
  const grid: ExcelJS.CellValue[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: ExcelJS.CellValue[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      cells.push(row.getCell(c).value);
    }
    grid.push(cells);
  }
  return grid;
}

/**
 * Stage 1 (PLAN.md §4). `exceljs` does throw — this is the one place that
 * catch happens, wrapped into the `Err` branch rather than propagating.
 */
export async function readWorkbook(buffer: ArrayBuffer): Promise<Result<RawWorkbook, ParseError>> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch (cause) {
    return err({
      kind: "NotAnXlsx",
      detail: cause instanceof Error ? cause.message : String(cause),
    });
  }

  try {
    const sheets = workbook.worksheets.map((sheet) => ({
      name: sheet.name,
      grid: sheetToGrid(sheet),
    }));
    return ok({ sheets });
  } catch (cause) {
    return err({ kind: "WorkbookUnreadable", cause });
  }
}
