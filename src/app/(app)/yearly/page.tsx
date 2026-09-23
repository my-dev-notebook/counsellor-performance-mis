import { getYearlyWorkbook } from "@/db/queries/dashboard";
import { listYearsWithData } from "@/db/queries/performance";
import { getDailySuccessfulApplicationCountsForSession } from "@/db/queries/dailySuccessfulApplications";
import { PageHeader } from "@/components/shell/PageHeader";
import { CompanyDashboard } from "@/components/dashboard/CompanyDashboard";
import { DashboardSwitch } from "@/components/dashboard/DashboardSwitch";
import { TeamDashboard } from "@/components/dashboard/TeamDashboard";
import { CounsellorDashboard } from "@/components/dashboard/CounsellorDashboard";
import { YearPicker } from "@/components/YearPicker";
import { currentYearDate, parseYearDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import type { ParsedWorkbook } from "@/schemas/parser";

/** Same split as the monthly page; the yearly counsellor view swaps the month calendar for a session-long heatmap. */
async function DashboardForScope({
    user,
    workbook,
    year,
}: {
    user: CurrentUser;
    workbook: ParsedWorkbook;
    year: string;
}) {
    switch (user.scope.kind) {
        case "all":
            return (
                <div data-component="DashboardForScope" className="contents">
                    <CompanyDashboard workbook={workbook} />
                </div>
            );
        case "team":
            return (
                <div data-component="DashboardForScope" className="contents">
                    <TeamDashboard workbook={workbook} />
                </div>
            );
        case "self": {
            const days = await getDailySuccessfulApplicationCountsForSession(user.id, year);
            return (
                <div data-component="DashboardForScope" className="contents">
                    <CounsellorDashboard workbook={workbook} userId={user.id} session={{ year, days }} />
                </div>
            );
        }
        case "none":
            return (
                <p data-component="DashboardForScope" className="empty">
                    Nothing to show for your account.
                </p>
            );
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

    // A counsellor's "My team" tab lists their teammates, so their workbook keeps the team's rows.
    const workbook = await getYearlyWorkbook(year, user.scope, { includeTeammates: user.scope.kind === "self" });

    return (
        <div data-component="YearlyDashboardPage" className="stack gap-5">
            <PageHeader
                title="Yearly dashboard"
                sub={`${workbook.monthLabel} · ${String(workbook.counsellors.length)} counsellors · ${String(workbook.teams.length)} teams`}
                actions={
                    <>
                        <DashboardSwitch active="yearly" />
                        <YearPicker year={year} basePath="/yearly" />
                    </>
                }
            />
            <p className="alert alert-info">
                <span>
                    A session runs October to September and is named after the year it ends in (October 2026 to
                    September 2027 is session 2027). Every month of the session is rolled into one: each
                    counsellor&apos;s Target, Non-Negotiable and Achieved are summed across the months on record, filed
                    under the team they were on most recently.
                </span>
            </p>
            <DashboardForScope user={user} workbook={workbook} year={year} />
        </div>
    );
}
