import { getTeamMonthlyPoints, getTeamMonthlySeries } from "@/db/queries/reports";
import { listTeams } from "@/db/queries/teams";
import { TeamTrendChart } from "@/components/reports/TeamTrendChart";
import { TrendCharts } from "@/components/reports/TrendCharts";
import { PageHeader } from "@/components/shell/PageHeader";
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
            <div data-component="TeamReportsPage" className="stack gap-5">
                <PageHeader title="Team performance" sub="Achievement % by team across every month on record." />
                <TeamTrendChart series={series} />
            </div>
        );
    }

    const teamId = scope.kind === "none" ? null : scope.teamId;
    const team = teamId === null ? undefined : (await listTeams()).find((t) => t.id === teamId);
    const points = team ? await getTeamMonthlyPoints(team.name, scope) : [];

    return (
        <div data-component="TeamReportsPage" className="stack gap-5">
            <PageHeader
                title={`Team performance${team ? ` — ${team.name}` : ""}`}
                sub="Your team's Target vs Achieved and Achievement % across every month on record."
            />
            {team ? (
                <TrendCharts points={points} />
            ) : (
                <div className="card">
                    <p className="empty">You are not assigned to a team.</p>
                </div>
            )}
        </div>
    );
}
