import { getCompanyMonthlySeries } from "@/db/queries/reports";
import { CompanyTrendChart } from "@/components/reports/CompanyTrendChart";

export default async function ReportsOverviewPage() {
  const points = await getCompanyMonthlySeries();

  return (
    <div data-component="ReportsOverviewPage" className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Company-wide performance across every month on record.
        </p>
      </div>
      <CompanyTrendChart points={points} />
    </div>
  );
}
