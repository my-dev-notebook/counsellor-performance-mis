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

/**
 * "YYYY" — a SESSION year, the yearly dashboard's `?year=` param. Not a
 * calendar year: a session runs October → September and is named after the
 * calendar year it ENDS in, so "2027" covers 2026-10 … 2027-09 (see
 * `sessionOfMonth`).
 */
export const YearDate = z.string().regex(/^\d{4}$/, "year must be YYYY");
export type YearDate = z.infer<typeof YearDate>;

/** First month of a session (1-12). October: the session for 2027 begins in 2026-10. */
export const SESSION_START_MONTH = 10;

/** The session year ("YYYY") a "YYYY-MM" month belongs to — Oct–Dec roll into the NEXT calendar year. */
export function sessionOfMonth(monthDate: string): string {
    const [yearStr, monthStr] = monthDate.split("-");
    const year = Number.parseInt(yearStr ?? "", 10);
    const month = Number.parseInt(monthStr ?? "", 10);
    return String(month >= SESSION_START_MONTH ? year + 1 : year);
}

/** Every "YYYY-MM" month of a session year, in order: "2027" → ["2026-10", …, "2027-09"]. */
export function sessionMonths(sessionYear: string): string[] {
    const end = Number.parseInt(sessionYear, 10);
    return Array.from({ length: 12 }, (_, i) => {
        const month = ((SESSION_START_MONTH - 1 + i) % 12) + 1;
        const year = month >= SESSION_START_MONTH ? end - 1 : end;
        return `${String(year)}-${String(month).padStart(2, "0")}`;
    });
}

/** "Oct 2026 – Sep 2027" — the calendar span a session year covers. */
export function formatSessionSpan(sessionYear: string): string {
    const end = Number.parseInt(sessionYear, 10);
    return `Oct ${String(end - 1)} – Sep ${String(end)}`;
}

/** "YYYY-MM-DD" — the `admissions.date` shape, e.g. "2026-09-10". */
export const DayDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD");
export type DayDate = z.infer<typeof DayDate>;

/** Today's month as a `MonthDate`, in the server's local timezone. */
export function currentMonthDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Today's SESSION year as a `YearDate` (October onward already counts as next year's session). */
export function currentYearDate(): string {
    return sessionOfMonth(currentMonthDate());
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

/** `parseMonthDateParam`'s counterpart for a `?year=YYYY` search param. */
export function parseYearDateParam(value: string | string[] | undefined, fallback = currentYearDate()): string {
    return YearDate.safeParse(value).success ? (value as string) : fallback;
}
