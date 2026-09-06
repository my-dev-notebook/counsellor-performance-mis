import { getProgressForMonth, getMonthSummary, listMonthsWithData } from "@/db/queries/performance";
import { EntryView } from "@/components/entry/EntryView";

function parseIntParam(value: string | string[] | undefined, fallback: number): number {
  if (typeof value !== "string") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export default async function EntryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = parseIntParam(params.year, now.getFullYear());
  const month = parseIntParam(params.month, now.getMonth() + 1);

  const [progress, summary, months] = await Promise.all([
    getProgressForMonth(year, month, { includeInactive: true }),
    getMonthSummary(year, month, { includeInactive: false }),
    listMonthsWithData(),
  ]);

  return (
    <div data-component="EntryPage" className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Monthly Performance Entry</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Fill in or update one counsellor&apos;s figures at a time. Save persists immediately.
        </p>
      </div>
      <EntryView year={year} month={month} progress={progress} summary={summary} existingMonths={months} />
    </div>
  );
}
