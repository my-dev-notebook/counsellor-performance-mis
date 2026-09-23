import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";
import { ACHIEVED_SOURCES } from "@/schemas/achieved-source";
import { OVERALL_RATINGS, RATINGS } from "@/schemas/call-audit";

/**
 * Authoritative schema. History is kept the "snapshot + changelog" way:
 *
 *   - `users` is one row per real person, for life. A team/role/agency change
 *     is a direct UPDATE of that row.
 *   - Every `successful_applications` and `counsellor_perf_monthly` row carries the
 *     `team_id`/`agency_id` the counsellor belonged to when the row was
 *     created, so historical reads never depend on the user's current row.
 *   - `user_changes` is an append-only log of every team/role/agency/active
 *     change, so "who was where when" can always be reconstructed.
 */

export const teams = sqliteTable("teams", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    isActive: integer("is_active").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const agencies = sqliteTable("agencies", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    isActive: integer("is_active").notNull().default(1),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Lookup table rather than a CHECK constraint so a new role is one INSERT.
// The permission each role carries lives in code, keyed by `name`
// (src/lib/auth/permissions.ts); a role unknown to the code gets no access.
export const roles = sqliteTable("roles", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
});

// One row per PERSON. `id` is the stable identity used by every FK.
export const users = sqliteTable(
    "users",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        // Login identifier.
        email: text("email").notNull().unique(),
        // Meritto's own user id for this person (7-8 digits, e.g. 16098382).
        // Required for counsellors -- it is the join key for the successful applications
        // auto-fetch (`counsellorId` in src/utils/meritto/fetch-applicants.ts)
        // -- and optional for everyone else. Enforced in the action layer.
        merittoUserId: integer("meritto_user_id").unique(),
        roleId: integer("role_id")
            .notNull()
            .references(() => roles.id),
        // NULL for admins; counsellors and team leaders always have one.
        teamId: integer("team_id").references(() => teams.id),
        agencyId: integer("agency_id").references(() => agencies.id),
        isActive: integer("is_active").notNull().default(1),
        // ISO date (YYYY-MM-DD). NULL for users seeded before it was tracked.
        dateOfJoining: text("date_of_joining"),
        // PBKDF2 digest (src/lib/auth/password.ts). Never a plaintext password.
        passwordHash: text("password_hash").notNull(),
        // NULL means the seeded default password is still in place and the
        // user must change it before doing anything else.
        passwordChangedAt: text("password_changed_at"),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [index("idx_users_team").on(table.teamId), index("idx_users_role").on(table.roleId)],
);

// Append-only. One row per changed field per mutation; `old_value` is NULL
// on creation. Never updated or deleted.
export const userChanges = sqliteTable(
    "user_changes",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        // 'team_id' | 'role_id' | 'agency_id' | 'is_active'
        field: text("field").notNull(),
        oldValue: integer("old_value"),
        newValue: integer("new_value"),
        // NULL when the change was made by a migration/seed rather than a user.
        changedBy: integer("changed_by").references(() => users.id),
        changedAt: text("changed_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        index("idx_user_changes_user").on(table.userId, table.changedAt),
        check("chk_user_changes_field", sql`${table.field} IN ('team_id', 'role_id', 'agency_id', 'is_active')`),
    ],
);

// Server-side login sessions. The cookie holds only `id`; every request looks
// the row up (src/lib/auth/session.ts), so revoking access is a DELETE here or
// setting `users.is_active = 0`. `expires_at` slides forward on activity.
export const sessions = sqliteTable(
    "sessions",
    {
        id: text("id").primaryKey(),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        expiresAt: text("expires_at").notNull(),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [index("idx_sessions_user").on(table.userId)],
);

// One row per counsellor per month. `pending`/`% achieved`/`status` are
// never stored here — always recomputed at read time via the existing
// src/lib/metrics/derive.ts + buckets.ts logic.
//
// `date` is a "YYYY-MM" string (e.g. "2026-09"). `achieved` is nullable:
// NULL means "not yet finalized" — for the live/current month it's computed
// on the fly from `successful_applications` at read time (see getAchievedForMonth /
// getAchievedForCounsellors in src/db/queries/performance.ts); for a
// closed/past month it's written in by the finalize job
// (src/db/queries/finalize.ts) so history reads stay a single cheap lookup.
//
// `team_id`/`agency_id` are the counsellor's team/agency when the row was
// first created (the "team at month start" rule) and are never touched by
// later upserts, so a mid-month team change does not rewrite the month. The
// one exception is a workbook import where the operator explicitly chose
// "take sheet" on a row whose sheet team differs (src/db/queries/imports.ts).
//
// `achieved_source` says who wrote `achieved`. A workbook's monthly total is
// allowed to disagree with COUNT(*) over `successful_applications` (the sheets carry
// corrections the daily rows never see), and when it does the stored total
// wins: finalize only overwrites rows whose source is still 'successful_applications',
// and the discrepancies screen surfaces the rest.
export const counsellorPerfMonthly = sqliteTable(
    "counsellor_perf_monthly",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        teamId: integer("team_id")
            .notNull()
            .references(() => teams.id),
        agencyId: integer("agency_id").references(() => agencies.id),
        date: text("date").notNull(),
        overall: integer("overall"),
        nonNegotiable: integer("non_negotiable"),
        achieved: integer("achieved"),
        achievedSource: text("achieved_source", { enum: ACHIEVED_SOURCES }).notNull().default("successful_applications"),
        // The import that last wrote this row's `achieved`, when the source is 'import'.
        importId: integer("import_id").references(() => imports.id),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        uniqueIndex("idx_counsellor_perf_monthly_user_date").on(table.userId, table.date),
        index("idx_counsellor_perf_monthly_team_date").on(table.teamId, table.date),
        index("idx_counsellor_perf_monthly_import").on(table.importId),
        check("chk_overall_non_negative", sql`${table.overall} IS NULL OR ${table.overall} >= 0`),
        check("chk_non_negotiable_non_negative", sql`${table.nonNegotiable} IS NULL OR ${table.nonNegotiable} >= 0`),
        check("chk_achieved_non_negative", sql`${table.achieved} IS NULL OR ${table.achieved} >= 0`),
        check("chk_achieved_source", sql`${table.achievedSource} IN ('successful_applications', 'import', 'manual')`),
    ],
);

// One row per committed workbook import (the Upload page's "Import" flow).
// Every monthly row an import writes `achieved` into points back here via
// `import_id`, so the discrepancies screen can name the file a number came
// from. `notes` is a JSON array of the human-readable flags the operator saw
// and accepted (name/email differences, snapshot rewrites, roster updates).
export const imports = sqliteTable(
    "imports",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        // "YYYY-MM", the month the workbook was imported into.
        date: text("date").notNull(),
        sourceFileName: text("source_file_name").notNull(),
        importedBy: integer("imported_by")
            .notNull()
            .references(() => users.id),
        importedAt: text("imported_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        rowsInserted: integer("rows_inserted").notNull().default(0),
        rowsUpdated: integer("rows_updated").notNull().default(0),
        rowsSkipped: integer("rows_skipped").notNull().default(0),
        usersCreated: integer("users_created").notNull().default(0),
        notes: text("notes").notNull().default("[]"),
    },
    (table) => [
        index("idx_imports_date").on(table.date),
        check("chk_imports_date_format", sql`${table.date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'`),
    ],
);

// One row per SUCCESSFUL APPLICATION -- not one row per day. `date` is the "YYYY-MM-DD" the
// successful application is credited to, and a day's count is COUNT(*) over its rows, so a
// stored number can never drift out of sync with the records behind it (there
// is no `count` column anywhere).
//
// Column names mirror `Applicant` from src/utils/meritto/fetch-applicants.ts,
// so an entry round-trips identically whether it was typed by hand or pulled
// from the successful applications auto-fetch. The scraper yields strings; `applicant_user_id`
// and `form_id` are integers here, coerced at the action-layer boundary.
//
// `application_number` is UNIQUE across the whole table: one successful application belongs
// to exactly one counsellor on exactly one day. This is the guarantee that
// makes the auto-fetch safe to re-run.
//
// `team_id`/`agency_id` are snapshots of the counsellor's assignment at insert
// time, so team-level range queries (`WHERE team_id = ? AND date BETWEEN ...`)
// never join through the user's current row.
export const successfulApplications = sqliteTable(
    "successful_applications",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        teamId: integer("team_id")
            .notNull()
            .references(() => teams.id),
        agencyId: integer("agency_id").references(() => agencies.id),
        date: text("date").notNull(),
        applicationNumber: text("application_number").notNull().unique(),
        applicantUserId: integer("applicant_user_id").notNull(),
        applicantName: text("applicant_name").notNull(),
        formId: integer("form_id").notNull(),
        formName: text("form_name").notNull(),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        // The daily-entry page reads one counsellor's whole month, and
        // getAchievedForCounsellors groups a month by user.
        index("idx_successful_applications_user_date").on(table.userId, table.date),
        // Date range queries: company-wide, per team, per agency.
        index("idx_successful_applications_date").on(table.date),
        index("idx_successful_applications_team_date").on(table.teamId, table.date),
        index("idx_successful_applications_agency_date").on(table.agencyId, table.date),
        check("chk_successful_applications_date_format", sql`${table.date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
        check("chk_successful_applications_applicant_user_id_positive", sql`${table.applicantUserId} > 0`),
        check("chk_successful_applications_form_id_positive", sql`${table.formId} > 0`),
    ],
);

// One row per AUDITED CALL (migrations/0005_call_audits.sql). A quality
// analyst picks one of a counsellor's calls every few days and scores it on
// eight fixed parameters, one rating_*/reason_* column pair each (keys and
// labels in src/schemas/call-audit.ts; renamed from a..h in migration 0007).
//
// `period_start`/`period_end` is the date window the call was picked from.
// Windows may overlap and nothing here is unique; the only rule is that
// `call_at`'s date falls inside its window. AQS is never stored -- it is
// (pass + na) / 8, recomputed at read time via `computeAqs`. `overall_rating`
// is the analyst's own judgement, not derived from AQS.
//
// `team_id` snapshots the counsellor's team at audit time, like `successful_applications`.
export const callAudits = sqliteTable(
    "call_audits",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        teamId: integer("team_id")
            .notNull()
            .references(() => teams.id),
        auditedBy: integer("audited_by")
            .notNull()
            .references(() => users.id),
        // "YYYY-MM-DD HH:MM", local wall-clock time the call started.
        callAt: text("call_at").notNull(),
        durationSeconds: integer("duration_seconds").notNull(),
        phone: text("phone").notNull(),
        applicationId: text("application_id"),
        periodStart: text("period_start").notNull(),
        periodEnd: text("period_end").notNull(),
        ratingOpening: text("rating_opening", { enum: RATINGS }).notNull(),
        ratingLanguage: text("rating_language", { enum: RATINGS }).notNull(),
        ratingListening: text("rating_listening", { enum: RATINGS }).notNull(),
        ratingPoliteness: text("rating_politeness", { enum: RATINGS }).notNull(),
        ratingInformation: text("rating_information", { enum: RATINGS }).notNull(),
        ratingUsp: text("rating_usp", { enum: RATINGS }).notNull(),
        ratingClosure: text("rating_closure", { enum: RATINGS }).notNull(),
        ratingConversion: text("rating_conversion", { enum: RATINGS }).notNull(),
        reasonOpening: text("reason_opening"),
        reasonLanguage: text("reason_language"),
        reasonListening: text("reason_listening"),
        reasonPoliteness: text("reason_politeness"),
        reasonInformation: text("reason_information"),
        reasonUsp: text("reason_usp"),
        reasonClosure: text("reason_closure"),
        reasonConversion: text("reason_conversion"),
        overallRating: text("overall_rating", { enum: OVERALL_RATINGS }).notNull().default("meets_expectations"),
        feedback: text("feedback").notNull().default(""),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        index("idx_call_audits_user_call_at").on(table.userId, table.callAt),
        index("idx_call_audits_team_call_at").on(table.teamId, table.callAt),
        index("idx_call_audits_period").on(table.periodStart, table.periodEnd),
        // Two short GLOBs: D1 rejects a GLOB pattern longer than 50 characters.
        check(
            "chk_call_audits_call_at_format",
            sql`length(${table.callAt}) = 16 AND substr(${table.callAt}, 1, 10) GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr(${table.callAt}, 11, 6) GLOB ' [0-9][0-9]:[0-9][0-9]'`,
        ),
        check(
            "chk_call_audits_period_start_format",
            sql`${table.periodStart} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
        ),
        check(
            "chk_call_audits_period_end_format",
            sql`${table.periodEnd} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
        ),
        check("chk_call_audits_period_order", sql`${table.periodStart} <= ${table.periodEnd}`),
        check(
            "chk_call_audits_call_in_period",
            sql`substr(${table.callAt}, 1, 10) BETWEEN ${table.periodStart} AND ${table.periodEnd}`,
        ),
        check("chk_call_audits_duration_non_negative", sql`${table.durationSeconds} >= 0`),
        check("chk_call_audits_rating_opening", sql`${table.ratingOpening} IN ('pass', 'fail', 'na')`),
        check("chk_call_audits_rating_language", sql`${table.ratingLanguage} IN ('pass', 'fail', 'na')`),
        check("chk_call_audits_rating_listening", sql`${table.ratingListening} IN ('pass', 'fail', 'na')`),
        check("chk_call_audits_rating_politeness", sql`${table.ratingPoliteness} IN ('pass', 'fail', 'na')`),
        check("chk_call_audits_rating_information", sql`${table.ratingInformation} IN ('pass', 'fail', 'na')`),
        check("chk_call_audits_rating_usp", sql`${table.ratingUsp} IN ('pass', 'fail', 'na')`),
        check("chk_call_audits_rating_closure", sql`${table.ratingClosure} IN ('pass', 'fail', 'na')`),
        check("chk_call_audits_rating_conversion", sql`${table.ratingConversion} IN ('pass', 'fail', 'na')`),
        check(
            "chk_call_audits_overall_rating",
            sql`${table.overallRating} IN ('outstanding', 'exceeded_expectations', 'meets_expectations', 'needs_improvement')`,
        ),
    ],
);
