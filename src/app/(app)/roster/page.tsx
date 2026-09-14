import { listUsers, listRoles } from "@/db/queries/users";
import { listTeams } from "@/db/queries/teams";
import { listAgencies } from "@/db/queries/agencies";
import { RosterView } from "@/components/roster/RosterView";
import { requirePermission } from "@/lib/auth/session";

export default async function RosterPage() {
    const user = await requirePermission("readTeamRows");
    const [users, roles, teams, agencies] = await Promise.all([
        listUsers(user.scope, { includeInactive: true }),
        listRoles(),
        listTeams(),
        listAgencies(),
    ]);

    return (
        <div
            data-component="RosterPage"
            className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Users</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {user.permissions.manageUsers
                        ? "Manage every account — counsellors, team leaders, MIS executives and admins: add users, edit profiles, change role/team/agency, reset passwords, deactivate and reactivate. Every assignment change is logged."
                        : user.permissions.manageRoster
                          ? "Manage the roster: add counsellors, edit profiles, and change team/agency. Every assignment change is logged."
                          : "Everyone on your team."}
                </p>
            </div>
            <RosterView
                users={users}
                roles={roles}
                teams={teams}
                agencies={agencies}
                currentUserId={user.id}
                permissions={user.permissions}
            />
        </div>
    );
}
