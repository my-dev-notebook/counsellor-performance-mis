import { getTeamMonthlySeries } from "@/db/queries/reports";
import { TeamTrendChart } from "@/components/reports/TeamTrendChart";

export default async function TeamReportsPage() {
  const series = await getTeamMonthlySeries();

  return (
    <div data-component="TeamReportsPage" className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Team Performance</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Achievement % by team across every month on record.
        </p>
      </div>
      <TeamTrendChart series={series} />
    </div>
  );
}
