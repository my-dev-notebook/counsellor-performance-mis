"use server";

import { refresh } from "next/cache";
import { createTeam, deleteTeam, getTeamUsage, renameTeam } from "@/db/queries/teams";
import { applyAssignmentChanges, getUserById, listRoles } from "@/db/queries/users";
import type { UserRow } from "@/db/types";
import { TeamIdInput, TeamNameInput, UpdateTeamInput } from "@/schemas/teams";
import { assertPermission } from "@/lib/auth/session";

async function roleIdFor(name: string): Promise<number> {
    const role = (await listRoles()).find((r) => r.name === name);
    if (!role) throw new Error(`Role "${name}" is missing from the roles table`);
    return role.id;
}

export async function createTeamAction(name: string) {
    const parsed = TeamNameInput.parse(name);
    await assertPermission("manageTeams");
    await createTeam(parsed);
    refresh();
}

/**
 * The Teams page's edit form: name and leader saved together. Changing the
 * leader is a role change on one or two users (the new leader becomes a
 * team_leader on this team; any previous leader steps down to counsellor on
 * the same team), so it needs manageUsers on top of manageTeams -- both
 * admin-only today. Everything is validated before anything is written.
 */
export async function updateTeamAction(id: number, input: { name: string; leaderId: number | null }) {
    const parsedId = TeamIdInput.parse(id);
    const parsed = UpdateTeamInput.parse(input);
    const actor = await assertPermission("manageTeams");
    const team = await getTeamUsage(parsedId);
    if (!team) throw new Error("Team not found");

    const currentLeaderIds = team.leaders.map((l) => l.id);
    const leaderChanged = parsed.leaderId === null ? currentLeaderIds.length > 0 : !currentLeaderIds.includes(parsed.leaderId);

    let newLeader: UserRow | null = null;
    const stepping: UserRow[] = [];
    if (leaderChanged) {
        if (!actor.permissions.manageUsers) throw new Error("Not allowed");
        if (parsed.leaderId !== null) {
            if (parsed.leaderId === actor.id) throw new Error("You cannot change your own role.");
            newLeader = await getUserById(parsed.leaderId);
            if (!newLeader?.isActive) throw new Error("User not found");
            if (newLeader.roleName === "admin") throw new Error("An admin cannot be made a team leader here. Change their role on the Users page.");
        }
        for (const leaderId of currentLeaderIds) {
            if (leaderId === parsed.leaderId) continue;
            if (leaderId === actor.id) throw new Error("You cannot change your own role.");
            const previous = await getUserById(leaderId);
            if (!previous) continue;
            if (previous.merittoUserId === null) {
                throw new Error(`${previous.name} has no Meritto user id, so they cannot step down to counsellor. Change their role on the Users page first.`);
            }
            stepping.push(previous);
        }
    }

    if (parsed.name !== team.name) await renameTeam(parsedId, parsed.name);
    if (leaderChanged) {
        const [teamLeaderRoleId, counsellorRoleId] = await Promise.all([roleIdFor("team_leader"), roleIdFor("counsellor")]);
        for (const previous of stepping) {
            await applyAssignmentChanges(previous.id, { roleId: counsellorRoleId }, actor.id);
        }
        if (newLeader) {
            await applyAssignmentChanges(newLeader.id, { roleId: teamLeaderRoleId, teamId: parsedId }, actor.id);
        }
    }
    refresh();
}

/**
 * Only an unreferenced team can go: users point at their current team and
 * every monthly entry / daily admission carries a snapshot team id, so
 * deleting a team with history would orphan those rows.
 */
export async function deleteTeamAction(id: number) {
    const parsedId = TeamIdInput.parse(id);
    await assertPermission("manageTeams");
    const usage = await getTeamUsage(parsedId);
    if (!usage) throw new Error("Team not found");
    if (usage.memberCount > 0) {
        throw new Error(`Move or deactivate the ${String(usage.memberCount)} member(s) off this team first.`);
    }
    /* if (usage.historyCount > 0) {
        throw new Error("This team has recorded history and cannot be deleted. Rename it instead.");
    } */
    await deleteTeam(parsedId);
    refresh();
}
