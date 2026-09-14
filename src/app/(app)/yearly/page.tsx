import { getYearlyWorkbook } from "@/db/queries/dashboard";
import { listYearsWithData } from "@/db/queries/performance";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { YearPicker } from "@/components/YearPicker";
import { currentYearDate, parseYearDateParam } from "@/schemas/dates";
import { requireUser } from "@/lib/auth/session";

export default async function YearlyDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requireUser();
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
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Yearly</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Every month of the year rolled into one: each counsellor&apos;s Target, Non-Negotiable and
                        Achieved are summed across the months on record, filed under the team they were on most
                        recently.
                    </p>
                </div>
                <YearPicker year={year} existingYears={years} basePath="/yearly" />
                <Dashboard workbook={workbook} />
            </main>
        </div>
    );
}
