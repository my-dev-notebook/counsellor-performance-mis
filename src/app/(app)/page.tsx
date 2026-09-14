import { getMonthlyWorkbook } from "@/db/queries/dashboard";
import { getDailyAdmissionsForMonth } from "@/db/queries/dailyAdmissions";
import { listMonthsWithData } from "@/db/queries/performance";
import { Header } from "@/components/Header";
import { CompanyDashboard } from "@/components/dashboard/CompanyDashboard";
import { TeamDashboard } from "@/components/dashboard/TeamDashboard";
import { CounsellorDashboard } from "@/components/dashboard/CounsellorDashboard";
import { MonthPicker } from "@/components/MonthPicker";
import { currentMonthDate, parseMonthDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import type { ParsedWorkbook } from "@/schemas/parser";

/** One view component per scope — the role decides the component, not branches inside it. */
async function DashboardForScope({ user, workbook, date }: { user: CurrentUser; workbook: ParsedWorkbook; date: string }) {
    switch (user.scope.kind) {
        case "all":
            return <CompanyDashboard workbook={workbook} />;
        case "team":
            return <TeamDashboard workbook={workbook} />;
        case "self": {
            const admissions = await getDailyAdmissionsForMonth(user.id, date);
            return <CounsellorDashboard workbook={workbook} userId={user.id} monthDate={date} admissions={admissions} />;
        }
        case "none":
            return <p className="py-8 text-center text-sm text-muted-foreground">Nothing to show for your account.</p>;
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

    const workbook = await getMonthlyWorkbook(date, user.scope);

    return (
        <div data-component="MonthlyDashboardPage" className="flex min-h-full flex-1 flex-col bg-background">
            <Header
                monthLabel={workbook.monthLabel}
                counsellorCount={workbook.counsellors.length}
                teamCount={workbook.teams.length}
            />
            <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Monthly</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        One month at a time — what is currently recorded for the selected month.
                    </p>
                </div>
                <MonthPicker date={date} existingMonths={months} basePath="/" />
                <DashboardForScope user={user} workbook={workbook} date={date} />
            </main>
        </div>
    );
}
