import { and, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import { agencies, counsellorPerfMonthly, imports, teams, users } from "@/db/schema";
import { getAchievedForCounsellors } from "@/db/queries/performance";
import type { Scope } from "@/lib/auth/permissions";
import { combine, scopeRowCondition } from "@/lib/auth/permissions";
import type { AchievedSource } from "@/schemas/achieved-source";

/**
 * The two ways a month can disagree with itself, both surfaced on
 * /entry/discrepancies:
 *
 *   - a stored `achieved` (finalize, import or manual) that no longer equals
 *     COUNT(*) over that month's `successful_applications`;
 *   - a monthly row filed under a team/agency other than the user's current
 *     roster assignment (a mid-year move, or an import that took the sheet's
 *     team).
 *
 * Neither is an error by itself — the stored total is meant to win — but
 * whoever owns the numbers should be able to see and settle each one.
 */

export interface AchievedDiscrepancy {
    userId: number;
    userName: string;
    teamName: string | null;
    date: string;
    stored: number;
    source: AchievedSource;
    importId: number | null;
    importFileName: string | null;
    live: number;
}

export async function listAchievedDiscrepancies(date: string, scope: Scope): Promise<AchievedDiscrepancy[]> {
    const db = await getDb();
    const [rows, live] = await Promise.all([
        db
            .select({
                userId: counsellorPerfMonthly.userId,
                userName: users.name,
                teamName: teams.name,
                date: counsellorPerfMonthly.date,
                stored: counsellorPerfMonthly.achieved,
                source: counsellorPerfMonthly.achievedSource,
                importId: counsellorPerfMonthly.importId,
                importFileName: imports.sourceFileName,
            })
            .from(counsellorPerfMonthly)
            .innerJoin(users, eq(counsellorPerfMonthly.userId, users.id))
            .leftJoin(teams, eq(counsellorPerfMonthly.teamId, teams.id))
            .leftJoin(imports, eq(counsellorPerfMonthly.importId, imports.id))
            .where(
                combine(
                    eq(counsellorPerfMonthly.date, date),
                    isNotNull(counsellorPerfMonthly.achieved),
                    scopeRowCondition(scope, counsellorPerfMonthly.userId, counsellorPerfMonthly.teamId),
                ),
            )
            .orderBy(users.name),
        getAchievedForCounsellors(date),
    ]);
    return rows.flatMap((row) => {
        const liveCount = live.get(row.userId) ?? 0;
        if (row.stored === null || row.stored === liveCount) return [];
        return [{ ...row, stored: row.stored, live: liveCount }];
    });
}

export interface SnapshotDiscrepancy {
    userId: number;
    userName: string;
    isActive: boolean;
    date: string;
    snapshotTeamId: number;
    snapshotTeamName: string | null;
    snapshotAgencyId: number | null;
    snapshotAgencyName: string | null;
    rosterTeamId: number | null;
    rosterTeamName: string | null;
    rosterAgencyId: number | null;
    rosterAgencyName: string | null;
}

export async function listSnapshotDiscrepancies(date: string, scope: Scope): Promise<SnapshotDiscrepancy[]> {
    const db = await getDb();
    const snapshotTeams = alias(teams, "snapshot_teams");
    const snapshotAgencies = alias(agencies, "snapshot_agencies");
    const rows = await db
        .select({
            userId: counsellorPerfMonthly.userId,
            userName: users.name,
            isActive: users.isActive,
            date: counsellorPerfMonthly.date,
            snapshotTeamId: counsellorPerfMonthly.teamId,
            snapshotTeamName: snapshotTeams.name,
            snapshotAgencyId: counsellorPerfMonthly.agencyId,
            snapshotAgencyName: snapshotAgencies.name,
            rosterTeamId: users.teamId,
            rosterTeamName: teams.name,
            rosterAgencyId: users.agencyId,
            rosterAgencyName: agencies.name,
        })
        .from(counsellorPerfMonthly)
        .innerJoin(users, eq(counsellorPerfMonthly.userId, users.id))
        .leftJoin(snapshotTeams, eq(counsellorPerfMonthly.teamId, snapshotTeams.id))
        .leftJoin(snapshotAgencies, eq(counsellorPerfMonthly.agencyId, snapshotAgencies.id))
        .leftJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(agencies, eq(users.agencyId, agencies.id))
        .where(
            combine(
                eq(counsellorPerfMonthly.date, date),
                sql`(${counsellorPerfMonthly.teamId} IS NOT ${users.teamId} OR ${counsellorPerfMonthly.agencyId} IS NOT ${users.agencyId})`,
                scopeRowCondition(scope, counsellorPerfMonthly.userId, counsellorPerfMonthly.teamId),
            ),
        )
        .orderBy(users.name);
    return rows.map((row) => ({ ...row, isActive: row.isActive === 1 }));
}

/**
 * Settle an achieved discrepancy. `null` hands the month back to the live
 * daily count (source 'successful_applications', and finalize may write it again); a
 * number pins it as a manual figure that finalize leaves alone.
 */
export async function setAchievedOverride(userId: number, date: string, achieved: number | null): Promise<void> {
    const db = await getDb();
    await db
        .update(counsellorPerfMonthly)
        .set({
            achieved,
            achievedSource: achieved === null ? "successful_applications" : "manual",
            importId: null,
            updatedAt: sql`(datetime('now'))`,
        })
        .where(and(eq(counsellorPerfMonthly.userId, userId), eq(counsellorPerfMonthly.date, date)));
}

/** Re-file one month under a different team/agency snapshot (the discrepancies screen's "use roster" action). */
export async function setSnapshotAssignment(
    userId: number,
    date: string,
    teamId: number,
    agencyId: number | null,
): Promise<void> {
    const db = await getDb();
    await db
        .update(counsellorPerfMonthly)
        .set({ teamId, agencyId, updatedAt: sql`(datetime('now'))` })
        .where(and(eq(counsellorPerfMonthly.userId, userId), eq(counsellorPerfMonthly.date, date)));
}

/** The snapshot a month is filed under, for pushing it back onto the roster. */
export async function getSnapshotAssignment(
    userId: number,
    date: string,
): Promise<{ teamId: number; agencyId: number | null } | null> {
    const db = await getDb();
    const rows = await db
        .select({ teamId: counsellorPerfMonthly.teamId, agencyId: counsellorPerfMonthly.agencyId })
        .from(counsellorPerfMonthly)
        .where(and(eq(counsellorPerfMonthly.userId, userId), eq(counsellorPerfMonthly.date, date)));
    return rows[0] ?? null;
}
