import { z } from "zod";
import { MonthDate } from "@/schemas/dates";

/**
 * The monthly entry form's Save payload (DATA_ENTRY_INTERFACE.md §4.3 step 5).
 *
 * `achieved` is absent on purpose: it is never typed in. For an open month it's
 * computed from `admissions` at read time, and for a closed month the finalize
 * job writes it (src/db/queries/finalize.ts). Both fields are nullable because
 * a target can legitimately be left blank.
 */
export const SaveEntryInput = z.object({
    userId: z.number().int(),
    date: MonthDate,
    overall: z.number().int().min(0).nullable(),
    nonNegotiable: z.number().int().min(0).nullable(),
});
export type SaveEntryInput = z.infer<typeof SaveEntryInput>;

/** POST /api/finalize body — the manual "close the month" trigger. */
export const FinalizeMonthInput = z.object({ date: MonthDate });
export type FinalizeMonthInput = z.infer<typeof FinalizeMonthInput>;
