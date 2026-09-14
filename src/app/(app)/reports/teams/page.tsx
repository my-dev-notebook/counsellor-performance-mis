import { getTeamMonthlyPoints, getTeamMonthlySeries } from "@/db/queries/reports";
import { listTeams } from "@/db/queries/teams";
import { TeamTrendChart } from "@/components/reports/TeamTrendChart";
import { TrendCharts } from "@/components/reports/TrendCharts";
import { requirePermission } from "@/lib/auth/session";

/**
 * All-teams readers get the team-vs-team comparison; a team leader or
 * counsellor has exactly one team, so they get that team's own trend charts.
 */
export default async function TeamReportsPage() {
    const user = await requirePermission("viewPerformance");
    const { scope } = user;

    if (scope.kind === "all") {
        const series = await getTeamMonthlySeries(scope);
        return (
            <div data-component="TeamReportsPage" className="space-y-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Team Performance</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Achievement % by team across every month on record.
                    </p>
                </div>
                <TeamTrendChart series={series} />
            </div>
        );
    }

    const teamId = scope.kind === "none" ? null : scope.teamId;
    const team = teamId === null ? undefined : (await listTeams()).find((t) => t.id === teamId);
    const points = team ? await getTeamMonthlyPoints(team.name, scope) : [];

    return (
        <div data-component="TeamReportsPage" className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    Team Performance{team ? ` — ${team.name}` : ""}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your team&apos;s Target vs Achieved and Achievement % across every month on record.
                </p>
            </div>
            {team ? (
                <TrendCharts points={points} />
            ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">You are not assigned to a team.</p>
            )}
        </div>
    );
}
