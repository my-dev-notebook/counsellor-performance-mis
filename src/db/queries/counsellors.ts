import { eq, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, teams, agencies } from "@/db/schema";
import type { CounsellorRow } from "@/db/types";

function toCounsellorRow(row: {
    id: number;
    personId: number;
    name: string;
    email: string | null;
    merittoUserId: number;
    teamId: number;
    teamName: string;
    agencyId: number | null;
    agencyName: string | null;
    isActive: number;
}): CounsellorRow {
    return { ...row, isActive: row.isActive === 1 };
}

export async function listCounsellors(options?: { includeInactive?: boolean }): Promise<CounsellorRow[]> {
    const db = await getDb();
    const rows = await db
        .select({
            id: users.id,
            personId: users.personId,
            name: users.name,
            email: users.email,
            merittoUserId: users.merittoUserId,
            teamId: users.teamId,
            teamName: teams.name,
            agencyId: users.agencyId,
            agencyName: agencies.name,
            isActive: users.isActive,
        })
        .from(users)
        .innerJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(agencies, eq(users.agencyId, agencies.id))
        .where(options?.includeInactive ? undefined : eq(users.isActive, 1))
        .orderBy(users.name);
    return rows.map(toCounsellorRow);
}

export async function getActiveCounsellorById(id: number): Promise<CounsellorRow | null> {
    const db = await getDb();
    const rows = await db
        .select({
            id: users.id,
            personId: users.personId,
            name: users.name,
            email: users.email,
            merittoUserId: users.merittoUserId,
            teamId: users.teamId,
            teamName: teams.name,
            agencyId: users.agencyId,
            agencyName: agencies.name,
            isActive: users.isActive,
        })
        .from(users)
        .innerJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(agencies, eq(users.agencyId, agencies.id))
        .where(eq(users.id, id));
    const row = rows[0];
    return row ? toCounsellorRow(row) : null;
}

/** DATA_ENTRY_INTERFACE.md §4.1 — "Add counsellor": insert, then set person_id = id on that same new row. */
export async function createCounsellor(input: {
    name: string;
    email: string | null;
    merittoUserId: number;
    teamId: number;
    agencyId: number | null;
}): Promise<number> {
    const db = await getDb();
    const [inserted] = await db
        .insert(users)
        .values({
            name: input.name,
            email: input.email,
            merittoUserId: input.merittoUserId,
            teamId: input.teamId,
            agencyId: input.agencyId,
            personId: 0, // placeholder, corrected below
        })
        .returning({ id: users.id });
    if (!inserted) throw new Error("Failed to insert counsellor");
    await db.update(users).set({ personId: inserted.id }).where(eq(users.id, inserted.id));
    return inserted.id;
}

/** §4.1 — "Edit profile": plain UPDATE on the currently-active row, name/email/meritto id only. */
export async function updateCounsellorProfile(
    id: number,
    input: { name: string; email: string | null; merittoUserId: number },
): Promise<void> {
    const db = await getDb();
    await db
        .update(users)
        .set({
            name: input.name,
            email: input.email,
            merittoUserId: input.merittoUserId,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, id));
}

/**
 * §4.1 — "Change team/agency": deactivate the current row, insert a new row
 * copying name/email/meritto_user_id/person_id from it, with the new
 * team_id/agency_id. Carrying `meritto_user_id` forward is required, not
 * cosmetic: it's notNull, and the active-only unique index only frees the id
 * because the old row is deactivated first.
 * Deliberately a separate code path from `deactivateCounsellor` even though
 * both set is_active = 0 on the old row — see §4.1's warning not to merge them.
 */
export async function changeCounsellorAssignment(
    currentId: number,
    input: { teamId: number; agencyId: number | null },
): Promise<number> {
    const db = await getDb();
    const current = await getActiveCounsellorById(currentId);
    if (!current) throw new Error("Counsellor not found or not active");

    await db.update(users).set({ isActive: 0 }).where(eq(users.id, currentId));

    const [inserted] = await db
        .insert(users)
        .values({
            name: current.name,
            email: current.email,
            merittoUserId: current.merittoUserId,
            teamId: input.teamId,
            agencyId: input.agencyId,
            personId: current.personId,
            isActive: 1,
        })
        .returning({ id: users.id });
    if (!inserted) throw new Error("Failed to insert reassigned counsellor row");
    return inserted.id;
}

/** §4.1 — "Delete" (soft-delete): no successor row. Deactivating is terminal (no Restore). */
export async function deactivateCounsellor(id: number): Promise<void> {
    const db = await getDb();
    await db
        .update(users)
        .set({ isActive: 0 })
        .where(and(eq(users.id, id), eq(users.isActive, 1)));
}
