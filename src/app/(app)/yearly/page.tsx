import { getYearlyWorkbook } from "@/db/queries/dashboard";
import { listYearsWithData } from "@/db/queries/performance";
import { Header } from "@/components/Header";
import { CompanyDashboard } from "@/components/dashboard/CompanyDashboard";
import { TeamDashboard } from "@/components/dashboard/TeamDashboard";
import { CounsellorDashboard } from "@/components/dashboard/CounsellorDashboard";
import { YearPicker } from "@/components/YearPicker";
import { currentYearDate, parseYearDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import type { ParsedWorkbook } from "@/schemas/parser";

/** Same split as the monthly page; the yearly counsellor view has no calendar (a year has no days grid). */
function DashboardForScope({ user, workbook }: { user: CurrentUser; workbook: ParsedWorkbook }) {
    switch (user.scope.kind) {
        case "all":
            return <CompanyDashboard workbook={workbook} />;
        case "team":
            return <TeamDashboard workbook={workbook} />;
        case "self":
            return <CounsellorDashboard workbook={workbook} userId={user.id} />;
        case "none":
            return <p className="py-8 text-center text-sm text-muted-foreground">Nothing to show for your account.</p>;
    }
}

export default async function YearlyDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requirePermission("viewPerformance");
    const params = await searchParams;
    const years = await listYearsWithData(user.scope);
    const latest = years[0];
    const year = parseYearDateParam(params.year, latest ?? currentYearDate());

    const workbook = await getYearlyWorkbook(year, user.scope);

    return (
        <div data-component="YearlyDashboardPage" className="flex min-h-full flex-1 flex-col bg-background">
            <Header
                monthLabel={workbook.monthLabel}
                counsellorCount={workbook.counsellors.length}
                teamCount={workbook.teams.length}
            />
            <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Yearly (session)</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        A session runs October to September and is named after the year it ends in (October 2026
                        to September 2027 is session 2027). Every month of the session rolled into one: each
                        counsellor&apos;s Target, Non-Negotiable and Achieved are summed across the months on
                        record, filed under the team they were on most recently.
                    </p>
                </div>
                <YearPicker year={year} existingYears={years} basePath="/yearly" />
                <DashboardForScope user={user} workbook={workbook} />
            </main>
        </div>
    );
}
