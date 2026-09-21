import { listUsers, listRoles } from "@/db/queries/users";
import { listTeams } from "@/db/queries/teams";
import { listAgencies } from "@/db/queries/agencies";
import { RosterView } from "@/components/roster/RosterView";
import { PageHeader } from "@/components/shell/PageHeader";
import { requirePermission } from "@/lib/auth/session";

export default async function RosterPage() {
    const user = await requirePermission("viewRoster");
    const [users, roles, teams, agencies] = await Promise.all([
        listUsers(user.scope, { includeInactive: true }),
        listRoles(),
        listTeams(),
        listAgencies(),
    ]);

    return (
        <div data-component="RosterPage" className="stack gap-5">
            <PageHeader
                title="Users"
                sub={
                    user.permissions.manageUsers
                        ? "Manage every account — counsellors, team leaders, MIS executives and admins: add users, edit profiles, change role/team/agency, reset passwords, deactivate and reactivate. Every assignment change is logged."
                        : user.permissions.manageRoster
                          ? "Manage the roster: add counsellors, edit profiles, and change team/agency. Every assignment change is logged."
                          : "Everyone on your team."
                }
            />
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
