import { getMonthlyWorkbook } from "@/db/queries/dashboard";
import { listMonthsWithData } from "@/db/queries/performance";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { MonthPicker } from "@/components/MonthPicker";
import { currentMonthDate, parseMonthDateParam } from "@/schemas/dates";
import { requireUser } from "@/lib/auth/session";

export default async function MonthlyDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requireUser();
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
                <Dashboard workbook={workbook} />
            </main>
        </div>
    );
}
