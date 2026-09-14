import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, teams, counsellorPerfMonthly } from "@/db/schema";
import type { Status } from "@/schemas/parser";
import { derivePctAchieved } from "@/lib/metrics/derive";
import { deriveStatus } from "@/lib/metrics/buckets";
import { summarize } from "@/lib/metrics/summarize";
import { formatMonthLabel } from "@/lib/format";
import type { Scope } from "@/lib/auth/permissions";
import { combine, scopeRowCondition } from "@/lib/auth/permissions";
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
