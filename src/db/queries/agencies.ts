import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { agencies, users } from "@/db/schema";
import type { Agency } from "@/db/types";

export async function listAgencies(): Promise<Agency[]> {
    const db = await getDb();
    return db.select({
        id: agencies.id,
        name: agencies.name,
        isActive: agencies.isActive,
        createdAt: agencies.createdAt,
        updatedAt: agencies.updatedAt
    }).from(agencies).orderBy(agencies.name);
}

export interface AgencyWithUsage extends Agency {
    /** Users (active or not) currently assigned to the agency. */
    memberCount: number;
}

/** Every agency with how much refers to it — what decides whether it may be deleted. */
export async function listAgenciesWithUsage(): Promise<AgencyWithUsage[]> {
    const db = await getDb();
    const [all, members] = await Promise.all([
        listAgencies(),
        db
            .select({ agencyId: users.agencyId, n: count() })
            .from(users)
            .where(eq(users.isActive, 1))
            .groupBy(users.agencyId),
    ]);

    const tally = (rows: { agencyId: number | null; n: number }[]) =>
        new Map(rows.filter((r) => r.agencyId !== null).map((r) => [r.agencyId, r.n]));
    const memberBy = tally(members);

    return all.map((agency) => ({
        ...agency,
        memberCount: memberBy.get(agency.id) ?? 0,
    }));
}

export async function getAgencyUsage(id: number): Promise<AgencyWithUsage | null> {
    return (await listAgenciesWithUsage()).find((a) => a.id === id) ?? null;
}

export async function createAgency(name: string): Promise<void> {
    const db = await getDb();
    await db.insert(agencies).values({ name });
}

/** Historical rows reference agencies by id, so a rename shows up in past months too. */
export async function renameAgency(id: number, name: string): Promise<void> {
    const db = await getDb();
    await db.update(agencies).set({ name }).where(eq(agencies.id, id));
}

/** Caller must have checked that nothing references the agency (see `getAgencyUsage`). */
export async function deleteAgency(id: number): Promise<void> {
    const db = await getDb();
    await db.delete(agencies).where(eq(agencies.id, id));
}
