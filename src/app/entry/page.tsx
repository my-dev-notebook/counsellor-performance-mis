import { getProgressForMonth, getMonthSummary, listMonthsWithData } from "@/db/queries/performance";
import { EntryView } from "@/components/entry/EntryView";

const MONTH_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonthDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseDateParam(value: string | string[] | undefined): string {
    if (typeof value === "string" && MONTH_DATE_RE.test(value)) return value;
    return currentMonthDate();
}

export default async function EntryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const date = parseDateParam(params.date);

    const [progress, summary, months] = await Promise.all([
        getProgressForMonth(date, { includeInactive: true }),
        getMonthSummary(date, { includeInactive: false }),
        listMonthsWithData(),
    ]);

    return (
        <div data-component="EntryPage" className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Monthly Performance Entry</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Set each counsellor&apos;s monthly target (overall) and non-negotiable. Achieved is derived from
                    daily admissions — expand a row and use &quot;Manage daily admissions&quot; to record those.
                </p>
            </div>
            <EntryView date={date} progress={progress} summary={summary} existingMonths={months} />
        </div>
    );
}
