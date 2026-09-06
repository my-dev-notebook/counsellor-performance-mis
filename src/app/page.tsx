import { getMonthlyWorkbook } from "@/db/queries/dashboard";
import { listMonthsWithData } from "@/db/queries/performance";
import { Header } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { MonthPicker } from "@/components/MonthPicker";

function parseIntParam(value: string | string[] | undefined, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default async function LiveDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const months = await listMonthsWithData();
  const latest = months[0];
  const now = new Date();
  const year = parseIntParam(params.year, latest?.year ?? now.getFullYear());
  const month = parseIntParam(params.month, latest?.month ?? now.getMonth() + 1);

  const workbook = await getMonthlyWorkbook(year, month);

  return (
    <div data-component="LiveDashboardPage" className="flex min-h-full flex-1 flex-col bg-background">
      <Header
        monthLabel={workbook.monthLabel}
        counsellorCount={workbook.counsellors.length}
        teamCount={workbook.teams.length}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <MonthPicker year={year} month={month} existingMonths={months} basePath="/" />
        <Dashboard workbook={workbook} />
      </main>
    </div>
  );
}
