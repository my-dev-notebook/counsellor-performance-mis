import type { Warning } from "./schemas";

/**
 * Fatal parse failures — no report is possible at all (PLAN.md §8.2).
 * Recoverable problems are `Warning`s inside a successful `ParsedWorkbook`,
 * never represented here.
 */
export type ParseError =
  | { kind: "NotAnXlsx"; detail: string }
  | { kind: "NoTeamSheetsFound"; sheetsSeen: readonly string[]; warnings: readonly Warning[] }
  | { kind: "WorkbookUnreadable"; cause: unknown };

export function describeParseError(error: ParseError): string {
  switch (error.kind) {
    case "NotAnXlsx":
      return `The file could not be read as an .xlsx workbook: ${error.detail}`;
    case "NoTeamSheetsFound":
      return error.sheetsSeen.length > 0
        ? `None of the sheets in this workbook matched a known team (found: ${error.sheetsSeen.join(", ")}).`
        : "The workbook has no sheets.";
    case "WorkbookUnreadable":
      return "The workbook could not be read.";
  }
}
