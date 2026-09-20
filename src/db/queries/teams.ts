import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { roles, teams, users } from "@/db/schema";
import type { Team } from "@/db/types";

export async function listTeams(): Promise<Team[]> {
    const db = await getDb();
    return db.select({
        id: teams.id, name: teams.name, isActive: teams.isActive, createdAt: teams.createdAt, updatedAt: teams.updatedAt
    }).from(teams).orderBy(teams.name);
}

export interface TeamLeader {
    id: number;
    name: string;
}

export interface TeamWithUsage extends Team {
    /** Active users with the team_leader role whose team is this one. A team may have several, or none. */
    leaders: TeamLeader[];
    /** Members with `is_active = 1`. */
    memberCount: number;
}

/** Every team with how much refers to it — what decides whether it may be deleted. */
export async function listTeamsWithUsage(): Promise<TeamWithUsage[]> {
    const db = await getDb();
    const [all, leaders, members] = await Promise.all([
        listTeams(), // 6
        db
            .select({ id: users.id, name: users.name, teamId: users.teamId })
            .from(users)
            .innerJoin(roles, eq(users.roleId, roles.id))
            .where(and(eq(roles.name, "team_leader"), eq(users.isActive, 1)))
            .orderBy(users.name), // 1
        db
            .select({
                teamId: users.teamId,
                n: count(),
            })
            .from(users)
            .where(eq(users.isActive, 1))
            .groupBy(users.teamId), // 195 -> 99
    ]);

    const tally = (rows: { teamId: number | null; n: number }[]) =>
        new Map(rows.filter((r) => r.teamId !== null).map((r) => [r.teamId, r.n]));

    const memberBy = tally(members);

    return all.map((team) => ({
        ...team,
        leaders: leaders.filter((l) => l.teamId === team.id).map(({ id, name }) => ({ id, name })),
        memberCount: memberBy.get(team.id) ?? 0,
    }));
}

export async function getTeamUsage(id: number): Promise<TeamWithUsage | null> {
    return (await listTeamsWithUsage()).find((t) => t.id === id) ?? null;
}

export async function createTeam(name: string): Promise<void> {
    const db = await getDb();
    await db.insert(teams).values({ name });
}

/** Historical rows reference teams by id, so a rename shows up in past months too. */
export async function renameTeam(id: number, name: string): Promise<void> {
    const db = await getDb();
    await db.update(teams).set({ name }).where(eq(teams.id, id));
}

/** Caller must have checked that nothing references the team (see `getTeamUsage`). */
export async function deleteTeam(id: number): Promise<void> {
    const db = await getDb();
    await db.delete(teams).where(eq(teams.id, id));
}
