import { getMonthlyWorkbook } from "@/db/queries/dashboard";
import { listMonthsWithData } from "@/db/queries/performance";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { MonthPicker } from "@/components/MonthPicker";

const MONTH_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonthDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseDateParam(value: string | string[] | undefined, fallback: string): string {
    if (typeof value === "string" && MONTH_DATE_RE.test(value)) return value;
    return fallback;
}

export default async function LiveDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const months = await listMonthsWithData();
    const latest = months[0];
    const date = parseDateParam(params.date, latest ?? currentMonthDate());

    const workbook = await getMonthlyWorkbook(date);

    return (
        <div data-component="LiveDashboardPage" className="flex min-h-full flex-1 flex-col bg-background">
            <Header
                monthLabel={workbook.monthLabel}
                counsellorCount={workbook.counsellors.length}
                teamCount={workbook.teams.length}
            />
            <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <MonthPicker date={date} existingMonths={months} basePath="/" />
                <Dashboard workbook={workbook} />
            </main>
        </div>
    );
}
