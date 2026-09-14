import { eq, and, or, lt, desc, sql, like, inArray, isNotNull } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import { users, teams, agencies, roles, counsellorPerfMonthly, admissions } from "@/db/schema";
import type { MonthSummary, PerformanceEntry, ProgressRow, UserRow } from "@/db/types";
import type { Scope } from "@/lib/auth/permissions";
import { combine, rowVisible, scopeTeamCondition, userInScope } from "@/lib/auth/permissions";
import { getUserById } from "@/db/queries/users";

/** Roles whose users appear on the entry/progress screens as "counsellors". */
const COUNSELLOR_ROLES = ["counsellor"] as const;

/** Previous calendar month's "YYYY-MM" string, e.g. "2026-09" -> "2026-08". */
function previousMonthDate(date: string): string {
    const [yearStr, monthStr] = date.split("-");
    const year = Number.parseInt(yearStr ?? "", 10);
    const month = Number.parseInt(monthStr ?? "", 10);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return `${String(prevYear)}-${String(prevMonth).padStart(2, "0")}`;
}

/** Months that have at least one monthly row the scope may see (team-level, so a counsellor sees their team's months). */
export async function listMonthsWithData(scope: Scope): Promise<string[]> {
    const db = await getDb();
    const rows = await db
        .selectDistinct({ date: counsellorPerfMonthly.date })
        .from(counsellorPerfMonthly)
        .where(scopeTeamCondition(scope, counsellorPerfMonthly.userId, counsellorPerfMonthly.teamId))
        .orderBy(desc(counsellorPerfMonthly.date));
    return rows.map((r) => r.date);
}

/** Distinct years (as "YYYY") among `listMonthsWithData`, newest first. */
export async function listYearsWithData(scope: Scope): Promise<string[]> {
    const months = await listMonthsWithData(scope);
    return Array.from(new Set(months.map((m) => m.slice(0, 4))));
}

/**
 * Live "achieved" for every counsellor in one month: COUNT(*) of `admissions`
 * rows whose date falls inside the given "YYYY-MM" month, grouped by user. One
 * query, used to avoid N+1 lookups from getProgressForMonth's per-counsellor
 * list. Internal: callers only surface entries for users they may see.
 */
export async function getAchievedForCounsellors(monthDate: string): Promise<Map<number, number>> {
    const db = await getDb();
    const rows = await db
        .select({ userId: admissions.userId, total: sql<number>`COUNT(*)` })
        .from(admissions)
        .where(like(admissions.date, `${monthDate}-%`))
        .groupBy(admissions.userId);
    return new Map(rows.map((r) => [r.userId, Number(r.total)]));
}

/** Single-counsellor version of getAchievedForCounsellors, for one-off lookups. */
export async function getAchievedForMonth(userId: number, monthDate: string): Promise<number> {
    const db = await getDb();
    const rows = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(admissions)
        .where(and(eq(admissions.userId, userId), like(admissions.date, `${monthDate}-%`)));
    return Number(rows[0]?.total ?? 0);
}

/**
 * Every counsellor with their entry for `date`, plus users of any other role
 * who have an entry that month (someone who was a counsellor then and has
 * since been promoted still owns that month).
 *
 * The row's team is the entry's SNAPSHOT team when there is an entry, else
 * the user's current team — and that is what the scope filters on, so a team
 * leader sees whoever was on their team that month.
 *
 * `scope` is applied at TEAM level here (so a counsellor's own team feeds
 * team aggregates); callers that show individual rows must also pass them
 * through `rowVisible` — `getProgressForMonth` does that for you unless
 * `options.teamLevel` is set.
 */
export async function getProgressForMonth(
    date: string,
    scope: Scope,
    options?: { includeInactive?: boolean; teamLevel?: boolean },
): Promise<ProgressRow[]> {
    const db = await getDb();
    const snapshotTeams = alias(teams, "snapshot_teams");
    const effectiveTeamId = sql<number | null>`COALESCE(${counsellorPerfMonthly.teamId}, ${users.teamId})`;

    const [rows, liveAchieved] = await Promise.all([
        db
            .select({
                counsellor: {
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    merittoUserId: users.merittoUserId,
                    roleId: users.roleId,
                    roleName: roles.name,
                    teamId: users.teamId,
                    teamName: teams.name,
                    agencyId: users.agencyId,
                    agencyName: agencies.name,
                    isActive: users.isActive,
                    dateOfJoining: users.dateOfJoining,
                },
                entry: {
                    id: counsellorPerfMonthly.id,
                    userId: counsellorPerfMonthly.userId,
                    teamId: counsellorPerfMonthly.teamId,
                    agencyId: counsellorPerfMonthly.agencyId,
                    date: counsellorPerfMonthly.date,
                    overall: counsellorPerfMonthly.overall,
                    nonNegotiable: counsellorPerfMonthly.nonNegotiable,
                    achieved: counsellorPerfMonthly.achieved,
                    achievedSource: counsellorPerfMonthly.achievedSource,
                    importId: counsellorPerfMonthly.importId,
                },
                snapshotTeamName: snapshotTeams.name,
            })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .leftJoin(teams, eq(users.teamId, teams.id))
            .leftJoin(agencies, eq(users.agencyId, agencies.id))
            .leftJoin(
                counsellorPerfMonthly,
                and(eq(counsellorPerfMonthly.userId, users.id), eq(counsellorPerfMonthly.date, date)),
            )
            .leftJoin(snapshotTeams, eq(counsellorPerfMonthly.teamId, snapshotTeams.id))
            .where(
                combine(
                    scopeTeamCondition(scope, users.id, effectiveTeamId),
                    or(inArray(roles.name, [...COUNSELLOR_ROLES]), isNotNull(counsellorPerfMonthly.id)),
                    options?.includeInactive
                        ? undefined
                        : or(eq(users.isActive, 1), isNotNull(counsellorPerfMonthly.id)),
                ),
            )
            .orderBy(users.name),
        getAchievedForCounsellors(date),
    ]);

    const progress = rows.map((row): ProgressRow => {
        const counsellor: UserRow = { ...row.counsellor, isActive: row.counsellor.isActive === 1 };
        const entry: PerformanceEntry | null = row.entry === null ? null : { ...row.entry };
        // Finalized months carry a written `achieved`; a live/open month falls
        // back to the on-the-fly daily sum.
        if (entry && entry.achieved === null) {
            entry.achieved = liveAchieved.get(counsellor.id) ?? 0;
        }
        return {
            counsellor,
            entry,
            teamId: entry ? entry.teamId : counsellor.teamId,
            teamName: entry ? row.snapshotTeamName : counsellor.teamName,
        };
    });

    return options?.teamLevel
        ? progress
        : progress.filter((row) => rowVisible(scope, { userId: row.counsellor.id, teamId: row.teamId }));
}

export async function getMonthSummary(
    date: string,
    scope: Scope,
    options?: { includeInactive?: boolean },
): Promise<MonthSummary> {
    const progress = await getProgressForMonth(date, scope, options);
    const totalCount = progress.length;
    const filled = progress.filter((p) => p.entry !== null);
    const filledCount = filled.length;
    const targetSoFar = filled.reduce((sum, p) => sum + (p.entry?.overall ?? 0), 0);
    const achievedSoFar = filled
        .filter((p) => p.entry && p.entry.achieved !== null)
        .reduce((sum, p) => sum + (p.entry?.achieved ?? 0), 0);
    return { filledCount, totalCount, targetSoFar, achievedSoFar };
}

/** Prefill source: most recent entry strictly before `date`. */
export async function getPreviousEntry(userId: number, date: string): Promise<PerformanceEntry | null> {
    const db = await getDb();
    const rows = await db
        .select({
            id: counsellorPerfMonthly.id,
            userId: counsellorPerfMonthly.userId,
            teamId: counsellorPerfMonthly.teamId,
            agencyId: counsellorPerfMonthly.agencyId,
            date: counsellorPerfMonthly.date,
            overall: counsellorPerfMonthly.overall,
            nonNegotiable: counsellorPerfMonthly.nonNegotiable,
            achieved: counsellorPerfMonthly.achieved,
            achievedSource: counsellorPerfMonthly.achievedSource,
            importId: counsellorPerfMonthly.importId,
        })
        .from(counsellorPerfMonthly)
        .where(and(eq(counsellorPerfMonthly.userId, userId), lt(counsellorPerfMonthly.date, date)))
        .orderBy(desc(counsellorPerfMonthly.date))
        .limit(1);
    return rows[0] ?? null;
}

/**
 * One Save action, upsert via the (user_id, date) unique index.
 *
 * `team_id`/`agency_id` are snapshotted from the user's CURRENT assignment
 * only when the row is first created, and left alone on conflict — that is
 * the "team at month start" rule: whoever first records the month fixes which
 * team it counts for.
 */
export async function upsertEntry(input: {
    userId: number;
    date: string;
    overall: number | null;
    nonNegotiable: number | null;
}): Promise<void> {
    const db = await getDb();
    const user = await getUserById(input.userId);
    if (!user) throw new Error("User not found");
    if (user.teamId === null) throw new Error("User has no team; cannot record a monthly entry");
    await db
        .insert(counsellorPerfMonthly)
        .values({
            userId: input.userId,
            teamId: user.teamId,
            agencyId: user.agencyId,
            date: input.date,
            overall: input.overall,
            nonNegotiable: input.nonNegotiable,
        })
        .onConflictDoUpdate({
            target: [counsellorPerfMonthly.userId, counsellorPerfMonthly.date],
            set: { overall: input.overall, nonNegotiable: input.nonNegotiable, updatedAt: sql`(datetime('now'))` },
        });
}

/** Whether `scope` may read this user's individual rows (used by actions that take a userId). */
export async function userReadableInScope(userId: number, scope: Scope): Promise<boolean> {
    const user = await getUserById(userId);
    return user !== null && userInScope(scope, user);
}

export { previousMonthDate };
