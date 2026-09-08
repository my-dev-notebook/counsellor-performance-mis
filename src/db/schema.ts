import { sql } from "drizzle-orm";
import { sqliteTable, integer, text, uniqueIndex, check } from "drizzle-orm/sqlite-core";

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
        doj: text("doj"),
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
    ],
);

// One row per counsellor per month. `pending`/`% achieved`/`status` are
// never stored here — always recomputed at read time via the existing
// src/lib/metrics/derive.ts + buckets.ts logic (§3, §6).
//
// `date` is a "YYYY-MM" string (e.g. "2026-09") — replaces the old
// year/month int pair. `achieved` is nullable: NULL means "not yet
// finalized" — for the live/current month it's computed on the fly from
// `counsellorPerfDaily` at read time (see getAchievedForMonth /
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

// One row per counsellor per day. `date` is a "YYYY-MM-DD" string. `count`
// is the number of admissions that day; `metadata` is a minified JSON array
// string (one entry per admission, e.g. `[{"admissionId":...,"name":...}]`)
// that the app must keep in sync with `count` (count === parsed-metadata
// length) on every write — enforced in the zod schema / action layer, not
// in SQL.
export const counsellorPerfDaily = sqliteTable(
    "counsellor_perf_daily",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        date: text("date").notNull(),
        count: integer("count").notNull().default(0),
        metadata: text("metadata"),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        uniqueIndex("idx_counsellor_perf_daily_user_date").on(table.userId, table.date),
        check("chk_daily_count_non_negative", sql`${table.count} >= 0`),
    ],
);
