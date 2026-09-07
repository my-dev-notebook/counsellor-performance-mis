import { listCounsellors } from "@/db/queries/counsellors";
import { listTeams } from "@/db/queries/teams";
import { listAgencies } from "@/db/queries/agencies";
import { RosterView } from "@/components/roster/RosterView";

export default async function RosterPage() {
    const [counsellors, teams, agencies] = await Promise.all([
        listCounsellors({ includeInactive: true }),
        listTeams(),
        listAgencies(),
    ]);

    return (
        <div
            data-component="RosterPage"
            className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Counsellors</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Manage the roster: add counsellors, edit profiles, change team/agency, and deactivate.
                </p>
            </div>
            <RosterView counsellors={counsellors} teams={teams} agencies={agencies} />
        </div>
    );
}
