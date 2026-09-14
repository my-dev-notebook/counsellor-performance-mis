import { getCompanyMonthlySeries } from "@/db/queries/reports";
import { CompanyTrendChart } from "@/components/reports/CompanyTrendChart";
import { requireUser } from "@/lib/auth/session";

export default async function ReportsOverviewPage() {
    const user = await requireUser();
    const points = await getCompanyMonthlySeries(user.scope);

    return (
        <div data-component="ReportsOverviewPage" className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {user.scope.kind === "all"
                        ? "Company-wide performance across every month on record."
                        : user.scope.kind === "team"
                          ? "Your team's performance across every month on record."
                          : "Your performance across every month on record."}
                </p>
            </div>
            <CompanyTrendChart points={points} />
        </div>
    );
}
