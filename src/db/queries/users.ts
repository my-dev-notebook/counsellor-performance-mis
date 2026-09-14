import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, teams, agencies, roles, userChanges } from "@/db/schema";
import type { UserRow, UserChangeRow, Role } from "@/db/types";
import type { Scope } from "@/lib/auth/permissions";
import { combine, scopeRowCondition } from "@/lib/auth/permissions";

const USER_COLUMNS = {
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
};

function toUserRow(row: Omit<UserRow, "isActive"> & { isActive: number }): UserRow {
    return { ...row, isActive: row.isActive === 1 };
}

export async function listRoles(): Promise<Role[]> {
    const db = await getDb();
    return db.select().from(roles).orderBy(roles.id);
}

/**
 * Users visible to `scope`, optionally limited to some roles. `users` has no
 * team snapshot (it IS the current state), so the scope filters on the
 * current team.
 */
export async function listUsers(
    scope: Scope,
    options?: { includeInactive?: boolean; roleNames?: readonly string[] },
): Promise<UserRow[]> {
    const db = await getDb();
    const rows = await db
        .select(USER_COLUMNS)
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(agencies, eq(users.agencyId, agencies.id))
        .where(
            combine(
                scopeRowCondition(scope, users.id, users.teamId),
                options?.includeInactive ? undefined : eq(users.isActive, 1),
                options?.roleNames ? inArray(roles.name, [...options.roleNames]) : undefined,
            ),
        )
        .orderBy(users.name);
    return rows.map(toUserRow);
}

/** Unscoped single-row lookup — for the session layer and for mutations that check scope themselves. */
export async function getUserById(id: number): Promise<UserRow | null> {
    const db = await getDb();
    const rows = await db
        .select(USER_COLUMNS)
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .leftJoin(teams, eq(users.teamId, teams.id))
        .leftJoin(agencies, eq(users.agencyId, agencies.id))
        .where(eq(users.id, id));
    const row = rows[0];
    return row ? toUserRow(row) : null;
}

export async function getActiveUserById(id: number): Promise<UserRow | null> {
    const user = await getUserById(id);
    return user?.isActive ? user : null;
}

/** Login lookup: the only place the password hash leaves the table. */
export async function getUserForLogin(email: string): Promise<{
    id: number;
    passwordHash: string;
    isActive: boolean;
} | null> {
    const db = await getDb();
    const rows = await db
        .select({ id: users.id, passwordHash: users.passwordHash, isActive: users.isActive })
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));
    const row = rows[0];
    return row ? { ...row, isActive: row.isActive === 1 } : null;
}

export async function getPasswordState(id: number): Promise<{ passwordHash: string; passwordChangedAt: string | null } | null> {
    const db = await getDb();
    const rows = await db
        .select({ passwordHash: users.passwordHash, passwordChangedAt: users.passwordChangedAt })
        .from(users)
        .where(eq(users.id, id));
    return rows[0] ?? null;
}

export async function setPassword(id: number, passwordHash: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.update(users).set({ passwordHash, passwordChangedAt: now, updatedAt: now }).where(eq(users.id, id));
}

/** Admin reset: back to a temporary password that must be changed on next login. */
export async function resetPassword(id: number, passwordHash: string): Promise<void> {
    const db = await getDb();
    await db
        .update(users)
        .set({ passwordHash, passwordChangedAt: null, updatedAt: new Date().toISOString() })
        .where(eq(users.id, id));
}

/** The four columns whose every change is logged to `user_changes`. */
export interface AssignmentChanges {
    roleId?: number | undefined;
    teamId?: number | null | undefined;
    agencyId?: number | null | undefined;
    isActive?: boolean | undefined;
}

function toLogValue(value: number | boolean | null): number | null {
    if (value === null) return null;
    return typeof value === "boolean" ? (value ? 1 : 0) : value;
}

/**
 * THE one mutation path for role/team/agency/active. Applies the changed
 * fields as a direct UPDATE on the user's single row and appends one
 * `user_changes` row per field that actually changed, so the changelog can
 * never disagree with the row. Nothing else may write these four columns.
 *
 * D1 has no interactive transactions, so the UPDATE and the log INSERT are
 * two statements; a failure between them leaves the row updated but unlogged.
 */
export async function applyAssignmentChanges(
    userId: number,
    changes: AssignmentChanges,
    changedBy: number | null,
): Promise<void> {
    const db = await getDb();
    const current = await getUserById(userId);
    if (!current) throw new Error("User not found");

    const set: Partial<typeof users.$inferInsert> = {};
    const log: (typeof userChanges.$inferInsert)[] = [];

    const consider = (field: string, oldRaw: number | boolean | null, newRaw: number | boolean | null | undefined) => {
        if (newRaw === undefined) return false;
        const oldValue = toLogValue(oldRaw);
        const newValue = toLogValue(newRaw);
        if (oldValue === newValue) return false;
        log.push({ userId, field, oldValue, newValue, changedBy });
        return true;
    };

    if (consider("role_id", current.roleId, changes.roleId) && changes.roleId !== undefined) set.roleId = changes.roleId;
    if (consider("team_id", current.teamId, changes.teamId)) set.teamId = changes.teamId ?? null;
    if (consider("agency_id", current.agencyId, changes.agencyId)) set.agencyId = changes.agencyId ?? null;
    if (consider("is_active", current.isActive, changes.isActive)) set.isActive = changes.isActive ? 1 : 0;

    if (log.length === 0) return;
    await db
        .update(users)
        .set({ ...set, updatedAt: new Date().toISOString() })
        .where(eq(users.id, userId));
    await db.insert(userChanges).values(log);
}

/** Insert one user, logging the initial role/team/agency as changes from NULL. */
export async function createUser(
    input: {
        name: string;
        email: string;
        merittoUserId: number | null;
        dateOfJoining: string | null;
        roleId: number;
        teamId: number | null;
        agencyId: number | null;
        passwordHash: string;
    },
    changedBy: number | null,
): Promise<number> {
    const db = await getDb();
    const [inserted] = await db
        .insert(users)
        .values({
            name: input.name,
            email: input.email.trim().toLowerCase(),
            merittoUserId: input.merittoUserId,
            dateOfJoining: input.dateOfJoining,
            roleId: input.roleId,
            teamId: input.teamId,
            agencyId: input.agencyId,
            passwordHash: input.passwordHash,
            passwordChangedAt: null,
        })
        .returning({ id: users.id });
    if (!inserted) throw new Error("Failed to insert user");

    const log: (typeof userChanges.$inferInsert)[] = [
        { userId: inserted.id, field: "role_id", oldValue: null, newValue: input.roleId, changedBy },
    ];
    if (input.teamId !== null) {
        log.push({ userId: inserted.id, field: "team_id", oldValue: null, newValue: input.teamId, changedBy });
    }
    if (input.agencyId !== null) {
        log.push({ userId: inserted.id, field: "agency_id", oldValue: null, newValue: input.agencyId, changedBy });
    }
    await db.insert(userChanges).values(log);
    return inserted.id;
}

/** Name / email / Meritto id / joining date only — not logged, none of them affect history. */
export async function updateUserProfile(
    id: number,
    input: { name: string; email: string; merittoUserId: number | null; dateOfJoining: string | null },
): Promise<void> {
    const db = await getDb();
    await db
        .update(users)
        .set({
            name: input.name,
            email: input.email.trim().toLowerCase(),
            merittoUserId: input.merittoUserId,
            dateOfJoining: input.dateOfJoining,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, id));
}

/** Soft-delete through the logged path. Deactivating is terminal in the UI (no Restore). */
export async function deactivateUser(id: number, changedBy: number | null): Promise<void> {
    await applyAssignmentChanges(id, { isActive: false }, changedBy);
}

export async function listUserChanges(userId: number): Promise<UserChangeRow[]> {
    const db = await getDb();
    return db
        .select({
            id: userChanges.id,
            userId: userChanges.userId,
            field: userChanges.field,
            oldValue: userChanges.oldValue,
            newValue: userChanges.newValue,
            changedBy: userChanges.changedBy,
            changedAt: userChanges.changedAt,
            changedByName: users.name,
        })
        .from(userChanges)
        .leftJoin(users, eq(userChanges.changedBy, users.id))
        .where(eq(userChanges.userId, userId))
        .orderBy(userChanges.changedAt, userChanges.id);
}
