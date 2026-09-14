import { eq, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sessions } from "@/db/schema";

export async function createSession(id: string, userId: number, expiresAt: Date): Promise<void> {
    const db = await getDb();
    await db.insert(sessions).values({ id, userId, expiresAt: expiresAt.toISOString() });
}

export async function getSession(id: string): Promise<{ id: string; userId: number; expiresAt: string } | null> {
    const db = await getDb();
    const rows = await db
        .select({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
        .from(sessions)
        .where(eq(sessions.id, id));
    return rows[0] ?? null;
}

export async function extendSession(id: string, expiresAt: Date): Promise<void> {
    const db = await getDb();
    await db.update(sessions).set({ expiresAt: expiresAt.toISOString() }).where(eq(sessions.id, id));
}

export async function deleteSession(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, id));
}

/** Logout everywhere — used when a user is deactivated or their password is reset. */
export async function deleteSessionsForUser(userId: number): Promise<void> {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Opportunistic cleanup; called from login so the table does not grow forever. */
export async function deleteExpiredSessions(now: Date): Promise<void> {
    const db = await getDb();
    await db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString()));
}
