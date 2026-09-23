import { getMonthlyWorkbook } from "@/db/queries/dashboard";
import { getDailySuccessfulApplicationsForMonth } from "@/db/queries/dailySuccessfulApplications";
import { listMonthsWithData } from "@/db/queries/performance";
import { PageHeader } from "@/components/shell/PageHeader";
import { CompanyDashboard } from "@/components/dashboard/CompanyDashboard";
import { DashboardSwitch } from "@/components/dashboard/DashboardSwitch";
import { TeamDashboard } from "@/components/dashboard/TeamDashboard";
import { CounsellorDashboard } from "@/components/dashboard/CounsellorDashboard";
import { MonthPicker } from "@/components/MonthPicker";
import { currentMonthDate, parseMonthDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import type { ParsedWorkbook } from "@/schemas/parser";

/** One view component per scope — the role decides the component, not branches inside it. */
async function DashboardForScope({
    user,
    workbook,
    date,
}: {
    user: CurrentUser;
    workbook: ParsedWorkbook;
    date: string;
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
            const successfulApplications = await getDailySuccessfulApplicationsForMonth(user.id, date);
            return (
                <div data-component="DashboardForScope" className="contents">
                    <CounsellorDashboard
                        workbook={workbook}
                        userId={user.id}
                        monthDate={date}
                        successfulApplications={successfulApplications}
                    />
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

export default async function MonthlyDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requirePermission("viewPerformance");
    const params = await searchParams;
    const months = await listMonthsWithData(user.scope);
    const latest = months[0];
    const date = parseMonthDateParam(params.date, latest ?? currentMonthDate());

    // A counsellor's "My team" tab lists their teammates, so their workbook keeps the team's rows.
    const workbook = await getMonthlyWorkbook(date, user.scope, { includeTeammates: user.scope.kind === "self" });

    return (
        <div data-component="MonthlyDashboardPage" className="stack gap-5">
            <PageHeader
                title="Monthly dashboard"
                sub={`${workbook.monthLabel} · ${String(workbook.counsellors.length)} counsellors · ${String(workbook.teams.length)} teams — what is currently recorded for the selected month.`}
                actions={
                    <>
                        <DashboardSwitch active="monthly" />
                        <MonthPicker date={date} existingMonths={months} basePath="/" />
                    </>
                }
            />
            <DashboardForScope user={user} workbook={workbook} date={date} />
        </div>
    );
}
