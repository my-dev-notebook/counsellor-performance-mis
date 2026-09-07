import { getDb } from "@/db/client";
import { teams } from "@/db/schema";
import type { Team } from "@/db/types";

export async function listTeams(): Promise<Team[]> {
    const db = await getDb();
    return db.select({ id: teams.id, name: teams.name }).from(teams).orderBy(teams.name);
}
