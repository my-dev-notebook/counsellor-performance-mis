import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, teams, counsellorPerformance } from "@/db/schema";
import { CANONICAL_TEAMS } from "@/lib/parser/schemas";
import type { Status } from "@/lib/parser/schemas";
import { derivePctAchieved } from "@/lib/metrics/derive";
import { deriveStatus } from "@/lib/metrics/buckets";
import { summarize, summarizeByTeam } from "@/lib/metrics/summarize";
import { formatMonthLabel } from "@/lib/format";
import { getMonthlyWorkbook } from "./dashboard";
import { listMonthsWithData } from "./performance";

export interface MonthlyPoint {
  year: number;
  month: number;
  monthLabel: string;
  headcount: number;
  target: number;
  achieved: number;
  nonNegotiable: number | null;
  pctAchieved: number | null;
}

async function chronologicalMonths(): Promise<{ year: number; month: number }[]> {
  const months = await listMonthsWithData();
  return [...months].sort((a, b) => a.year - b.year || a.month - b.month);
}

/** Company-wide Target/Achieved/Non-Negotiable across every month with data. */
export async function getCompanyMonthlySeries(): Promise<MonthlyPoint[]> {
  const months = await chronologicalMonths();
  return Promise.all(
    months.map(async ({ year, month }) => {
      const workbook = await getMonthlyWorkbook(year, month);
      const s = summarize(workbook.counsellors);
      return {
        year,
        month,
        monthLabel: formatMonthLabel(year, month),
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

/** Per-team Achievement % (and raw totals) across every month with data. */
export async function getTeamMonthlySeries(): Promise<TeamSeries[]> {
  const months = await chronologicalMonths();
  const byTeam = new Map<string, MonthlyPoint[]>(CANONICAL_TEAMS.map((t) => [t, []]));

  for (const { year, month } of months) {
    const workbook = await getMonthlyWorkbook(year, month);
    const monthLabel = formatMonthLabel(year, month);
    for (const { team, summary } of summarizeByTeam(workbook.counsellors)) {
      const points = byTeam.get(team);
      if (!points) continue;
      points.push({
        year,
        month,
        monthLabel,
        headcount: summary.headcount,
        target: summary.target,
        achieved: summary.achieved,
        nonNegotiable: summary.nonNegotiable,
        pctAchieved: summary.pctAchieved,
      });
    }
  }

  return CANONICAL_TEAMS.map((team) => ({ team, points: byTeam.get(team) ?? [] })).filter(
    (t) => t.points.length > 0,
  );
}

export interface PersonOption {
  personId: number;
  name: string;
}

/** One entry per distinct human (by person_id), preferring their active assignment's name. */
export async function listPeopleForSelector(): Promise<PersonOption[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: users.id, personId: users.personId, name: users.name, isActive: users.isActive })
    .from(users);

  const best = new Map<number, { id: number; name: string; isActive: number }>();
  for (const row of rows) {
    const current = best.get(row.personId);
    if (!current || (row.isActive === 1 && current.isActive !== 1) || row.id > current.id) {
      best.set(row.personId, row);
    }
  }

  return Array.from(best.entries())
    .map(([personId, row]) => ({ personId, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface PersonHistoryPoint {
  year: number;
  month: number;
  monthLabel: string;
  team: string;
  target: number | null;
  nonNegotiable: number | null;
  achieved: number | null;
  pctAchieved: number | null;
  status: Status;
}

/**
 * One person's full recorded history across every assignment period they've
 * held (joined via `person_id`, not just their current `users` row) — every
 * `counsellor_performance` entry ever attached to any of their periods, in
 * chronological order.
 */
export async function getPersonHistory(personId: number): Promise<PersonHistoryPoint[]> {
  const db = await getDb();
  const rows = await db
    .select({
      year: counsellorPerformance.year,
      month: counsellorPerformance.month,
      overall: counsellorPerformance.overall,
      nonNegotiable: counsellorPerformance.nonNegotiable,
      achieved: counsellorPerformance.achieved,
      achievedFlagged: counsellorPerformance.achievedFlagged,
      teamName: teams.name,
    })
    .from(counsellorPerformance)
    .innerJoin(users, eq(counsellorPerformance.userId, users.id))
    .innerJoin(teams, eq(users.teamId, teams.id))
    .where(eq(users.personId, personId))
    .orderBy(asc(counsellorPerformance.year), asc(counsellorPerformance.month));

  return rows.map((row) => {
    const target = row.overall;
    const achieved = row.achievedFlagged === 1 ? null : row.achieved;
    const pctAchieved = derivePctAchieved(target, achieved);
    return {
      year: row.year,
      month: row.month,
      monthLabel: formatMonthLabel(row.year, row.month),
      team: row.teamName,
      target,
      nonNegotiable: row.nonNegotiable,
      achieved,
      pctAchieved,
      status: deriveStatus(pctAchieved),
    };
  });
}
