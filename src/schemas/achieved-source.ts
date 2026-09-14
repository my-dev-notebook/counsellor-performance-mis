import { z } from "zod";

/**
 * Who wrote `counsellor_perf_monthly.achieved`. Lives here (not in
 * src/db/schema.ts) because the import review screen needs it client-side
 * and must not pull drizzle into the browser bundle.
 *
 *   admissions -- finalize wrote COUNT(*) over `admissions`, or NULL = live
 *   import     -- a workbook import wrote the sheet's monthly total
 *   manual     -- typed in on the discrepancies screen
 */
export const ACHIEVED_SOURCES = ["admissions", "import", "manual"] as const;
export const AchievedSource = z.enum(ACHIEVED_SOURCES);
export type AchievedSource = z.infer<typeof AchievedSource>;
