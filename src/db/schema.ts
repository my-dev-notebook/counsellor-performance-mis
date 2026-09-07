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
export const counsellorPerformance = sqliteTable(
    "counsellor_performance",
    {
        id: integer("id").primaryKey({ autoIncrement: true }),
        userId: integer("user_id")
            .notNull()
            .references(() => users.id),
        year: integer("year").notNull(),
        month: integer("month").notNull(),
        overall: integer("overall"),
        nonNegotiable: integer("non_negotiable"),
        achieved: integer("achieved"),
        // Tri-state design for `achieved` (§5): NULL = not entered, any integer
        // (including 0) = a real value, independent of this flag.
        achievedFlagged: integer("achieved_flagged").notNull().default(0),
        // Nullable boolean: 1 (yes), 0 (no), NULL (not set) — a plain checkbox
        // can't represent "not set" as distinct from "no".
        acknowledgment: integer("acknowledgment"),
        feedback: text("feedback"),
        createdAt: text("created_at")
            .notNull()
            .default(sql`(datetime('now'))`),
        updatedAt: text("updated_at")
            .notNull()
            .default(sql`(datetime('now'))`),
    },
    (table) => [
        uniqueIndex("idx_counsellor_performance_user_year_month").on(table.userId, table.year, table.month),
        check("chk_month_range", sql`${table.month} BETWEEN 1 AND 12`),
        check("chk_overall_non_negative", sql`${table.overall} IS NULL OR ${table.overall} >= 0`),
        check("chk_non_negotiable_non_negative", sql`${table.nonNegotiable} IS NULL OR ${table.nonNegotiable} >= 0`),
        check("chk_achieved_non_negative", sql`${table.achieved} IS NULL OR ${table.achieved} >= 0`),
    ],
);
