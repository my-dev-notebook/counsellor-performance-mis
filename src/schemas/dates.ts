import { z } from "zod";

/**
 * The two date shapes the app stores as text, in one place — they were
 * previously re-declared as bare regexes in every action file that needed them.
 *
 * Both are strings, not `z.date()`: SQLite has no date type and the DB columns
 * are `text` with matching `GLOB` CHECK constraints (see src/db/schema.ts), so
 * a string is the storage shape and the zod schema mirrors it exactly.
 */

/** "YYYY-MM" — the `counsellor_perf_monthly.date` shape, e.g. "2026-09". */
export const MonthDate = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "date must be YYYY-MM");
export type MonthDate = z.infer<typeof MonthDate>;

/** "YYYY-MM-DD" — the `admissions.date` shape, e.g. "2026-09-10". */
export const DayDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");
export type DayDate = z.infer<typeof DayDate>;

/** Today's month as a `MonthDate`, in the server's local timezone. */
export function currentMonthDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Reads a `?date=YYYY-MM` search param, falling back when it's absent, repeated
 * (`string[]`), or malformed — a bad URL should land the user on a sane month,
 * not error. Every page that takes a month in its query string shares this;
 * they each had their own copy of the regex and this function before.
 */
export function parseMonthDateParam(value: string | string[] | undefined, fallback = currentMonthDate()): string {
    return MonthDate.safeParse(value).success ? (value as string) : fallback;
}
