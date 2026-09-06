"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { upsertEntry, getPreviousEntry, getProgressForMonth } from "@/db/queries/performance";
import type { PerformanceEntry, ProgressRow } from "@/db/types";

const SaveEntryInput = z.object({
  userId: z.number().int(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  overall: z.number().int().min(0).nullable(),
  nonNegotiable: z.number().int().min(0).nullable(),
  achieved: z.number().int().min(0).nullable(),
  achievedFlagged: z.boolean(),
  acknowledgment: z.boolean().nullable(),
  feedback: z.string().nullable(),
});

export async function saveEntryAction(input: z.infer<typeof SaveEntryInput>) {
  const parsed = SaveEntryInput.parse(input);
  await upsertEntry(parsed);
  refresh();
}

/** §4.3 step 6 — fetched on demand when a never-filled entry form is opened. */
export async function getPrefillAction(
  userId: number,
  year: number,
  month: number,
): Promise<Pick<PerformanceEntry, "overall" | "nonNegotiable"> | null> {
  const previous = await getPreviousEntry(userId, year, month);
  if (!previous) return null;
  return { overall: previous.overall, nonNegotiable: previous.nonNegotiable };
}

/**
 * DATA_ENTRY_INTERFACE.md §4.4 — export data source: every active counsellor,
 * blank where no entry exists yet for this month (confirmed default).
 */
export async function getExportDataAction(year: number, month: number): Promise<ProgressRow[]> {
  return getProgressForMonth(year, month, { includeInactive: false });
}
