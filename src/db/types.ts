import type { teams, agencies, roles, counsellorPerfMonthly, successfulApplications, userChanges } from "@/db/schema";

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
 * src/schemas/ as a zod schema — see `SuccessfulApplicationRecord`, re-exported at the
 * bottom of this file.
 */

export type Team = typeof teams.$inferSelect;

export type Agency = typeof agencies.$inferSelect;

export type Role = typeof roles.$inferSelect;

/**
 * A user as the roster/entry screens see them: one `users` row with its role,
 * team and agency names joined in, and `is_active` narrowed from SQLite's
 * integer to a real boolean at the query boundary.
 *
 * Password columns and `createdAt`/`updatedAt` are deliberately absent — no
 * screen shows them, and the hash must never leave the query layer.
 */
export interface UserRow {
    id: number;
    name: string;
    email: string;
    merittoUserId: number | null;
    roleId: number;
    roleName: string;
    teamId: number | null;
    teamName: string | null;
    agencyId: number | null;
    agencyName: string | null;
    isActive: boolean;
    /** "YYYY-MM-DD", or null when not recorded. */
    dateOfJoining: string | null;
}

/** One `user_changes` row, with the actor's name joined in. */
export type UserChangeRow = Omit<typeof userChanges.$inferSelect, "changedBy"> & {
    changedBy: number | null;
    changedByName: string | null;
};

/** One `counsellor_perf_monthly` row, without the timestamps no screen reads. */
export type PerformanceEntry = Omit<typeof counsellorPerfMonthly.$inferSelect, "createdAt" | "updatedAt">;

/**
 * One `successful_applications` row — a single successful application credited to one counsellor on one
 * day. There is no count column: a day's total is COUNT(*) over its rows.
 */
export type SuccessfulApplicationRow = Omit<typeof successfulApplications.$inferSelect, "createdAt" | "updatedAt">;

/**
 * One counsellor's month. `teamId`/`teamName` are the month's SNAPSHOT team
 * when an entry exists (`entry.teamId`), and the user's current team when the
 * month has no entry yet.
 */
export interface ProgressRow {
    counsellor: UserRow;
    entry: PerformanceEntry | null;
    teamId: number | null;
    teamName: string | null;
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
 * source of truth in src/schemas/successful-applications.ts.
 */
export type { SuccessfulApplicationRecord } from "@/schemas/successful-applications";
