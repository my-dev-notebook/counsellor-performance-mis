import { z } from "zod";

/**
 * Who wrote `counsellor_perf_monthly.achieved`. Lives here (not in
 * src/db/schema.ts) because the import review screen needs it client-side
 * and must not pull drizzle into the browser bundle.
 *
 *   successful_applications -- finalize wrote COUNT(*) over `successful_applications`, or NULL = live
 *   import                  -- a workbook import wrote the sheet's monthly total
 *   manual                  -- typed in on the discrepancies screen
 */
export const ACHIEVED_SOURCES = ["successful_applications", "import", "manual"] as const;
export const AchievedSource = z.enum(ACHIEVED_SOURCES);
export type AchievedSource = z.infer<typeof AchievedSource>;
