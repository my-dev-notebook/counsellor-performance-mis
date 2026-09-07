import { getDb } from "@/db/client";
import { agencies } from "@/db/schema";
import type { Agency } from "@/db/types";

export async function listAgencies(): Promise<Agency[]> {
    const db = await getDb();
    return db.select({ id: agencies.id, name: agencies.name }).from(agencies).orderBy(agencies.name);
}

export async function createAgency(name: string): Promise<void> {
    const db = await getDb();
    await db.insert(agencies).values({ name });
}
