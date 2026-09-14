import { listTeamsWithUsage } from "@/db/queries/teams";
import { listUsers } from "@/db/queries/users";
import { TeamsView } from "@/components/teams/TeamsView";
import { requirePermission } from "@/lib/auth/session";

export default async function TeamsPage() {
    const user = await requirePermission("manageTeams");
    const [teams, users] = await Promise.all([listTeamsWithUsage(), listUsers(user.scope)]);
    // Anyone active who could be made a leader: not an admin, not yourself.
    const candidates = users
        .filter((u) => u.roleName !== "admin" && u.id !== user.id)
        .map((u) => ({ id: u.id, name: u.name, roleName: u.roleName, teamId: u.teamId, teamName: u.teamName }));

    return (
        <div data-component="TeamsPage" className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Teams</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Counsellors and team leaders must belong to one of these teams; a team leader sees every row of
                    the team they lead. Renaming applies everywhere, including past months; a team can only be deleted
                    while nobody is on it and it has no recorded history.
                </p>
            </div>
            <TeamsView teams={teams} candidates={candidates} />
        </div>
    );
}
