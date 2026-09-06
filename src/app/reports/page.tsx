import { getCompanyMonthlySeries } from "@/db/queries/reports";
import { CompanyTrendChart } from "@/components/reports/CompanyTrendChart";

export default async function ReportsOverviewPage() {
  const points = await getCompanyMonthlySeries();

  return (
    <div data-component="ReportsOverviewPage" className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Company-wide performance across every month on record.
        </p>
      </div>
      <CompanyTrendChart points={points} />
    </div>
  );
}
