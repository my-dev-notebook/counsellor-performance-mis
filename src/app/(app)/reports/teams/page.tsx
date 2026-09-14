import { getTeamMonthlySeries } from "@/db/queries/reports";
import { TeamTrendChart } from "@/components/reports/TeamTrendChart";
import { requireUser } from "@/lib/auth/session";

export default async function TeamReportsPage() {
    const user = await requireUser();
    const series = await getTeamMonthlySeries(user.scope);

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
