"use server";

import { refresh } from "next/cache";
import {
    applyAssignmentChanges,
    createUser,
    deactivateUser,
    getUserById,
    listRoles,
    resetPassword,
    updateUserProfile,
} from "@/db/queries/users";
import { deleteSessionsForUser } from "@/db/queries/sessions";
import { AddUserInput, AssignmentChangeInput, EditUserInput, ProfileInput } from "@/schemas/roster";
import { assertPermission } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { roleRequiresMeritto, roleRequiresTeam, userInScope } from "@/lib/auth/permissions";

/** Temporary password for new and reset accounts; the app forces a change on first login. */
const DEFAULT_PASSWORD = "change-it";

async function roleNameFor(roleId: number): Promise<string> {
    const role = (await listRoles()).find((r) => r.id === roleId);
    if (!role) throw new Error("Unknown role");
    return role.name;
}

/** Cross-field rules that the schema cannot express: counsellors need a Meritto id and a team; team leaders need a team. */
function assertRoleConstraints(roleName: string, fields: { merittoUserId: number | null; teamId: number | null }) {
    if (roleRequiresMeritto(roleName) && fields.merittoUserId === null) {
        throw new Error("A counsellor must have a Meritto user id.");
    }
    if (roleRequiresTeam(roleName) && fields.teamId === null) {
        throw new Error(`A ${roleName.replace("_", " ")} must belong to a team.`);
    }
}

export async function addUserAction(input: AddUserInput) {
    const parsed = AddUserInput.parse(input);
    const roleName = await roleNameFor(parsed.roleId);
    // MIS executives may only add counsellors; other roles need manageUsers.
    const actor = await assertPermission(roleName === "counsellor" ? "manageRoster" : "manageUsers");
    assertRoleConstraints(roleName, parsed);
    await createUser({ ...parsed, passwordHash: await hashPassword(DEFAULT_PASSWORD) }, actor.id);
    refresh();
}

export async function updateProfileAction(id: number, input: ProfileInput) {
    const parsed = ProfileInput.parse(input);
    const actor = await assertPermission("manageRoster");
    const target = await getUserById(id);
    if (!target || !userInScope(actor.scope, target)) throw new Error("User not found");
    assertRoleConstraints(target.roleName, { merittoUserId: parsed.merittoUserId, teamId: target.teamId });
    await updateUserProfile(id, parsed);
    refresh();
}

/**
 * Profile + assignment in one save (the Users page's edit form). Profile
 * fields need manageRoster; a role change additionally needs manageUsers and
 * is never allowed on yourself. Cross-field rules are checked against the
 * combined new state, so e.g. clearing the Meritto id and switching role to
 * counsellor in the same save is rejected as a whole.
 */
export async function editUserAction(id: number, input: EditUserInput) {
    const parsed = EditUserInput.parse(input);
    const actor = await assertPermission("manageRoster");
    const target = await getUserById(id);
    if (!target || !userInScope(actor.scope, target)) throw new Error("User not found");

    const roleChanged = parsed.roleId !== undefined && parsed.roleId !== target.roleId;
    if (roleChanged) {
        if (!actor.permissions.manageUsers) throw new Error("Not allowed");
        if (actor.id === id) throw new Error("You cannot change your own role.");
    }
    const roleName = roleChanged && parsed.roleId !== undefined ? await roleNameFor(parsed.roleId) : target.roleName;
    assertRoleConstraints(roleName, { merittoUserId: parsed.merittoUserId, teamId: parsed.teamId });

    await updateUserProfile(id, { name: parsed.name, email: parsed.email, merittoUserId: parsed.merittoUserId });
    await applyAssignmentChanges(
        id,
        {
            ...(roleChanged ? { roleId: parsed.roleId } : {}),
            teamId: parsed.teamId,
            agencyId: parsed.agencyId,
        },
        actor.id,
    );
    refresh();
}

/**
 * The one entry point for team / agency / role / active changes. Every field
 * lands in `user_changes` with the acting user's id.
 */
export async function changeAssignmentAction(id: number, input: AssignmentChangeInput) {
    const parsed = AssignmentChangeInput.parse(input);
    const touchesUsers = parsed.roleId !== undefined || parsed.isActive !== undefined;
    const actor = await assertPermission(touchesUsers ? "manageUsers" : "manageRoster");
    const target = await getUserById(id);
    if (!target || !userInScope(actor.scope, target)) throw new Error("User not found");
    // Nobody may touch their own role or deactivate themselves -- not even an admin.
    if (actor.id === id && (parsed.roleId !== undefined || parsed.isActive === false)) {
        throw new Error("You cannot change your own role or deactivate yourself.");
    }

    const roleName = parsed.roleId === undefined ? target.roleName : await roleNameFor(parsed.roleId);
    const teamId = parsed.teamId === undefined ? target.teamId : parsed.teamId;
    assertRoleConstraints(roleName, { merittoUserId: target.merittoUserId, teamId });

    await applyAssignmentChanges(id, parsed, actor.id);
    if (parsed.isActive === false) await deleteSessionsForUser(id);
    refresh();
}

export async function deactivateUserAction(id: number) {
    const actor = await assertPermission("manageUsers");
    if (actor.id === id) throw new Error("You cannot deactivate yourself.");
    await deactivateUser(id, actor.id);
    await deleteSessionsForUser(id);
    refresh();
}

/** Back to the default password; the user is signed out everywhere and must change it on next login. */
export async function resetPasswordAction(id: number) {
    await assertPermission("manageUsers");
    await resetPassword(id, await hashPassword(DEFAULT_PASSWORD));
    await deleteSessionsForUser(id);
    refresh();
}
