import type { teams, agencies, counsellorPerfMonthly, admissions } from "@/db/schema";

/**
 * Row shapes for what the query layer RETURNS — deliberately not zod.
 *
 * These describe data that has already come out of SQLite, so there is nothing
 * to validate: the DB is the authority, and re-parsing its own output would add
 * a runtime cost plus a second source of truth that can drift from
 * src/db/schema.ts. They are therefore derived from the table definitions via
 * `$inferSelect` instead, so a column change shows up here as a type error.
 *
 * Anything that crosses the client/server boundary IS validated, and lives in
 * src/schemas/ as a zod schema — see `AdmissionRecord`, re-exported at the
 * bottom of this file.
 */

export type Team = typeof teams.$inferSelect;

export type Agency = typeof agencies.$inferSelect;

/**
 * A counsellor as the roster/entry screens see them: one `users` row with its
 * team and agency names joined in, and `is_active` narrowed from SQLite's
 * integer to a real boolean at the query boundary.
 *
 * `createdAt`/`updatedAt` are omitted — no screen shows them.
 */
export interface CounsellorRow {
    id: number;
    personId: number;
    name: string;
    email: string | null;
    merittoUserId: number;
    teamId: number;
    teamName: string;
    agencyId: number | null;
    agencyName: string | null;
    isActive: boolean;
}

/** One `counsellor_perf_monthly` row, without the timestamps no screen reads. */
export type PerformanceEntry = Omit<typeof counsellorPerfMonthly.$inferSelect, "createdAt" | "updatedAt">;

/**
 * One `admissions` row — a single admission credited to one counsellor on one
 * day. There is no count column: a day's total is COUNT(*) over its rows.
 */
export type AdmissionRow = Omit<typeof admissions.$inferSelect, "createdAt" | "updatedAt">;

export interface ProgressRow {
    counsellor: CounsellorRow;
    entry: PerformanceEntry | null;
}

export interface MonthSummary {
    filledCount: number;
    totalCount: number;
    targetSoFar: number;
    achievedSoFar: number;
}

/**
 * Re-exported so the components and queries that already import their types
 * from here keep one import site, while the schema itself stays the single
 * source of truth in src/schemas/admissions.ts.
 */
export type { AdmissionRecord } from "@/schemas/admissions";
