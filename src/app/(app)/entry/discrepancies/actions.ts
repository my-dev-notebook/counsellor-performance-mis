"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getSnapshotAssignment, setAchievedOverride, setSnapshotAssignment } from "@/db/queries/discrepancies";
import { userReadableInScope } from "@/db/queries/performance";
import { applyAssignmentChanges, getUserById } from "@/db/queries/users";
import { assertPermission } from "@/lib/auth/session";
import { MonthDate } from "@/schemas/dates";

const Target = z.object({ userId: z.number().int().positive(), date: MonthDate });

async function authorise(userId: number, date: string) {
    const parsed = Target.parse({ userId, date });
    const actor = await assertPermission("writeEntries");
    if (!(await userReadableInScope(parsed.userId, actor.scope))) throw new Error("User not found");
    return { actor, ...parsed };
}

/** Drop the stored total and show the live daily count again. */
export async function revertToLiveCountAction(userId: number, date: string) {
    const target = await authorise(userId, date);
    await setAchievedOverride(target.userId, target.date, null);
    refresh();
}

/** Pin a figure by hand; finalize will leave it alone. */
export async function setManualAchievedAction(userId: number, date: string, achieved: number) {
    const target = await authorise(userId, date);
    const value = z.number().int().min(0).parse(achieved);
    await setAchievedOverride(target.userId, target.date, value);
    refresh();
}

/** Re-file the month under the user's current roster team/agency. */
export async function applyRosterAssignmentAction(userId: number, date: string) {
    const target = await authorise(userId, date);
    const user = await getUserById(target.userId);
    if (!user) throw new Error("User not found");
    if (user.teamId === null) throw new Error("User has no roster team to file the month under.");
    await setSnapshotAssignment(target.userId, target.date, user.teamId, user.agencyId);
    refresh();
}

/** Move the user on the roster to the team/agency the month is filed under (logged like any roster change). */
export async function updateRosterFromSnapshotAction(userId: number, date: string) {
    const target = await authorise(userId, date);
    if (!target.actor.permissions.manageRoster) throw new Error("Not allowed");
    const snapshot = await getSnapshotAssignment(target.userId, target.date);
    if (!snapshot) throw new Error("No entry for that month");
    await applyAssignmentChanges(target.userId, { teamId: snapshot.teamId, agencyId: snapshot.agencyId }, target.actor.id);
    refresh();
}
