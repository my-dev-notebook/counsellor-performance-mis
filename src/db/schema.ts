import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, index, uniqueIndex, check } from "drizzle-orm/sqlite-core";

/**
 * DATA_ENTRY_INTERFACE.md §3 — authoritative schema. Comments here mirror
 * the rationale in that doc; read it before changing table shapes.
 */

export const teams = sqliteTable("teams", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
});

export const agencies = sqliteTable("agencies", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
});

// One row per ASSIGNMENT PERIOD, not one row per person for life — see
// `person_id` below and §4.1's add/edit/reassign/delete mechanics.
export const users = sqliteTable(
    "users",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        name: text("name").notNull(),
        email: text("email"),
        // Meritto's own user id for this person (an int in their UI — 7-8 digits
        // today, e.g. 16098382). Required: every counsellor has a Meritto
        // account, and it's the join key for the admissions auto-fetch
        // (`counsellorId` in src/utils/meritto/fetch-applicants.ts).
        merittoUserId: integer("meritto_user_id").notNull(),
        teamId: integer("team_id")
            .notNull()
            .references(() => teams.id),
        agencyId: integer("agency_id").references(() => agencies.id),
        isActive: integer("is_active").notNull().default(1),
        // Stable across every reassignment of the same human — set to this row's
        // own `id` on creation, copied forward (not regenerated) on reassignment.
        personId: integer("person_id").notNull(),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        // Enforces "at most one active assignment per person at a time" — the
        // reassignment mechanic in §4.1 depends on this invariant holding.
        uniqueIndex("idx_users_one_active_per_person")
            .on(table.personId)
            .where(sql`${table.isActive} = 1`),
        // Identifies the HUMAN, not the assignment, so it repeats across a
        // person's rows exactly like `person_id` — hence the same active-only
        // scoping, which lets the successor row claim the id once the previous
        // one is deactivated.
        uniqueIndex("idx_users_one_active_per_meritto_id")
            .on(table.merittoUserId)
            .where(sql`${table.isActive} = 1`),
    ],
);

// One row per counsellor per month. `pending`/`% achieved`/`status` are
// never stored here — always recomputed at read time via the existing
// src/lib/metrics/derive.ts + buckets.ts logic (§3, §6).
//
// `date` is a "YYYY-MM" string (e.g. "2026-09") — replaces the old
// year/month int pair. `achieved` is nullable: NULL means "not yet
// finalized" — for the live/current month it's computed on the fly from
// `admissions` at read time (see getAchievedForMonth /
// getAchievedForCounsellors in src/db/queries/performance.ts); for a
// closed/past month it's written in by the finalize job
// (src/db/queries/finalize.ts) so history reads stay a single cheap lookup.
export const counsellorPerfMonthly = sqliteTable(
    "counsellor_perf_monthly",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        date: text("date").notNull(),
        overall: integer("overall"),
        nonNegotiable: integer("non_negotiable"),
        achieved: integer("achieved"),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        uniqueIndex("idx_counsellor_perf_monthly_user_date").on(table.userId, table.date),
        check("chk_overall_non_negative", sql`${table.overall} IS NULL OR ${table.overall} >= 0`),
        check("chk_non_negotiable_non_negative", sql`${table.nonNegotiable} IS NULL OR ${table.nonNegotiable} >= 0`),
        check("chk_achieved_non_negative", sql`${table.achieved} IS NULL OR ${table.achieved} >= 0`),
    ],
);

// One row per ADMISSION -- not one row per day. `date` is the "YYYY-MM-DD" the
// admission is credited to, and a day's count is COUNT(*) over its rows, so a
// stored number can never drift out of sync with the records behind it (there
// is no `count` column anywhere).
//
// Column names mirror `Applicant` from src/utils/meritto/fetch-applicants.ts,
// so an entry round-trips identically whether it was typed by hand or pulled
// from the admissions auto-fetch. The scraper yields strings; `applicant_user_id`
// and `form_id` are integers here, coerced at the action-layer boundary.
//
// Every field is mandatory, and notNull columns enforce that directly -- which
// is the reason this is a table rather than a JSON blob on the daily row.
// SQLite prohibits subqueries in CHECK constraints, so `json_each` cannot be
// used there and a CHECK over a JSON array could only ever assert the envelope
// (valid JSON, non-empty array), never the per-element fields.
//
// `application_number` is UNIQUE across the whole table: one admission belongs
// to exactly one counsellor on exactly one day. This is the guarantee that
// makes the auto-fetch safe to re-run, and it is impossible to express on a
// JSON blob.
export const admissions = sqliteTable(
    "admissions",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
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
        // getAchievedForCounsellors groups a month by user -- both are covered
        // by this leading (user_id, date) pair.
        index("idx_admissions_user_date").on(table.userId, table.date),
        check("chk_admissions_date_format", sql`${table.date} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
        check("chk_admissions_applicant_user_id_positive", sql`${table.applicantUserId} > 0`),
        check("chk_admissions_form_id_positive", sql`${table.formId} > 0`),
    ],
);
