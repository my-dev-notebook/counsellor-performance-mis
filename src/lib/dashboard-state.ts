import type { ParseError } from "@/lib/parser/errors";
import type { ParsedWorkbook } from "@/schemas/parser";

/**
 * The one place a `Result` is unwrapped into view state (PLAN.md §8.2) —
 * `Result`s never leak into components below this.
 */
export type DashboardState =
    | { status: "idle" }
    | { status: "parsing"; fileName: string }
    | { status: "ready"; workbook: ParsedWorkbook }
    | { status: "failed"; error: ParseError; fileName: string };
