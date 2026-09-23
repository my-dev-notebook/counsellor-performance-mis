import { asc, eq, like, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, teams, counsellorPerfMonthly, successfulApplications } from "@/db/schema";
import type { Status } from "@/schemas/parser";
import { derivePctAchieved } from "@/lib/metrics/derive";
import { deriveStatus } from "@/lib/metrics/buckets";
import { summarize } from "@/lib/metrics/summarize";
import { formatMonthLabel } from "@/lib/format";
import type { Scope } from "@/lib/auth/permissions";
import { combine, scopeRowCondition, scopeTeamCondition } from "@/lib/auth/permissions";
import { getMonthlyWorkbook } from "./dashboard";
import { listMonthsWithData, getAchievedForMonth } from "./performance";

export interface MonthlyPoint {
    date: string;
    monthLabel: string;
    headcount: number;
    target: number;
    achieved: number;
    nonNegotiable: number | null;
    pctAchieved: number | null;
}

async function chronologicalMonths(scope: Scope): Promise<string[]> {
    const months = await listMonthsWithData(scope);
    return [...months].sort((a, b) => a.localeCompare(b));
}

/**
 * Target/Achieved/Non-Negotiable across every month with data, summed over
 * the counsellor rows the scope may see individually (company-wide for
 * all-team readers, own team for a team leader, own rows for a counsellor).
 */
export async function getCompanyMonthlySeries(scope: Scope): Promise<MonthlyPoint[]> {
    const months = await chronologicalMonths(scope);
    return Promise.all(
        months.map(async (date) => {
            const workbook = await getMonthlyWorkbook(date, scope);
            const s = summarize(workbook.counsellors);
            return {
                date,
                monthLabel: formatMonthLabel(date),
                headcount: s.headcount,
                target: s.target,
                achieved: s.achieved,
                nonNegotiable: s.nonNegotiable,
                pctAchieved: s.pctAchieved,
            };
        }),
    );
}

export interface TeamSeries {
    team: string;
    points: MonthlyPoint[];
}

/** Per-team Achievement % (and raw totals) across every month with data — from the scope's team aggregates. */
export async function getTeamMonthlySeries(scope: Scope): Promise<TeamSeries[]> {
    const months = await chronologicalMonths(scope);
    const byTeam = new Map<string, MonthlyPoint[]>();

    for (const date of months) {
        const workbook = await getMonthlyWorkbook(date, scope);
        const monthLabel = formatMonthLabel(date);
        // Team totals come from the workbook's aggregates, which are built
        // over the whole team even when the reader may only see their own row.
        for (const aggregate of workbook.teams) {
            let points = byTeam.get(aggregate.team);
            if (!points) {
                points = [];
                byTeam.set(aggregate.team, points);
            }
            points.push({
                date,
                monthLabel,
                headcount: aggregate.headcount,
                target: aggregate.target,
                achieved: aggregate.achieved,
                nonNegotiable: aggregate.nonNegotiable,
                pctAchieved: aggregate.pctAchieved,
            });
        }
    }

    return Array.from(byTeam, ([team, points]) => ({ team, points })).sort((a, b) => a.team.localeCompare(b.team));
}

export interface PersonOption {
    userId: number;
    name: string;
}

/** Every user whose individual history the scope may open, active or not. */
export async function listPeopleForSelector(scope: Scope): Promise<PersonOption[]> {
    const db = await getDb();
    const rows = await db
        .selectDistinct({ userId: users.id, name: users.name })
        .from(users)
        .innerJoin(counsellorPerfMonthly, eq(counsellorPerfMonthly.userId, users.id))
        .where(scopeRowCondition(scope, users.id, counsellorPerfMonthly.teamId))
        .orderBy(asc(users.name));
    return rows;
}

export interface PersonHistoryPoint {
    date: string;
    monthLabel: string;
    team: string;
    target: number | null;
    nonNegotiable: number | null;
    achieved: number | null;
    pctAchieved: number | null;
    status: Status;
}

/**
 * One user's full recorded history — every `counsellor_perf_monthly` row for
 * them, in chronological order, each labelled with the SNAPSHOT team it was
 * recorded under (so a team change shows up as a change in the series, and a
 * team leader only receives the months the person spent on their team).
 * `achieved` falls back to the live daily-sum for any month whose monthly
 * row hasn't been finalized yet.
 */
export async function getPersonHistory(userId: number, scope: Scope): Promise<PersonHistoryPoint[]> {
    const db = await getDb();
    const rows = await db
        .select({
            date: counsellorPerfMonthly.date,
            overall: counsellorPerfMonthly.overall,
            nonNegotiable: counsellorPerfMonthly.nonNegotiable,
            achieved: counsellorPerfMonthly.achieved,
            userId: counsellorPerfMonthly.userId,
            teamName: teams.name,
        })
        .from(counsellorPerfMonthly)
        .innerJoin(teams, eq(counsellorPerfMonthly.teamId, teams.id))
        .where(
            combine(
                eq(counsellorPerfMonthly.userId, userId),
                scopeRowCondition(scope, counsellorPerfMonthly.userId, counsellorPerfMonthly.teamId),
            ),
        )
        .orderBy(asc(counsellorPerfMonthly.date));

    return Promise.all(
        rows.map(async (row) => {
            const target = row.overall;
            const achieved = row.achieved === null ? await getAchievedForMonth(row.userId, row.date) : row.achieved;
            const pctAchieved = derivePctAchieved(target, achieved);
            return {
                date: row.date,
                monthLabel: formatMonthLabel(row.date),
                team: row.teamName,
                target,
                nonNegotiable: row.nonNegotiable,
                achieved,
                pctAchieved,
                status: deriveStatus(pctAchieved),
            };
        }),
    );
}

/** One team's monthly totals, from the same team aggregates `getTeamMonthlySeries` reads. */
export async function getTeamMonthlyPoints(teamName: string, scope: Scope): Promise<MonthlyPoint[]> {
    const series = await getTeamMonthlySeries(scope);
    return series.find((s) => s.team === teamName)?.points ?? [];
}

/**
 * Whose daily successful applications to count. `company` is only meaningful for an
 * all-teams scope; a narrower scope's team filter still applies underneath
 * (a counsellor asking for "company" gets their own team, nothing more).
 */
export type DailySubject = { kind: "company" } | { kind: "team"; teamId: number } | { kind: "person"; userId: number };

export interface DailyPoint {
    /** "YYYY-MM-DD" */
    date: string;
    /** Day of month, 1-31. */
    day: number;
    count: number;
}

/**
 * Successful applications per day across one "YYYY-MM" month for the subject — every day
 * of the month is present, days without successful applications at 0. A person's series is
 * gated by the scope's ROW filter (individual rows), a team's or the
 * company's by its TEAM filter (aggregates).
 */
export async function getDailyCounts(monthDate: string, subject: DailySubject, scope: Scope): Promise<DailyPoint[]> {
    const db = await getDb();
    const subjectCondition =
        subject.kind === "person"
            ? combine(eq(successfulApplications.userId, subject.userId), scopeRowCondition(scope, successfulApplications.userId, successfulApplications.teamId))
            : combine(
                  subject.kind === "team" ? eq(successfulApplications.teamId, subject.teamId) : undefined,
                  scopeTeamCondition(scope, successfulApplications.userId, successfulApplications.teamId),
              );

    const rows = await db
        .select({ date: successfulApplications.date, count: sql<number>`COUNT(*)` })
        .from(successfulApplications)
        .where(combine(like(successfulApplications.date, `${monthDate}-%`), subjectCondition))
        .groupBy(successfulApplications.date);
    const byDate = new Map(rows.map((r) => [r.date, Number(r.count)]));

    const [yearStr, monthStr] = monthDate.split("-");
    const daysInMonth = new Date(Number.parseInt(yearStr ?? "", 10), Number.parseInt(monthStr ?? "", 10), 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
        const date = `${monthDate}-${String(i + 1).padStart(2, "0")}`;
        return { date, day: i + 1, count: byDate.get(date) ?? 0 };
    });
}
