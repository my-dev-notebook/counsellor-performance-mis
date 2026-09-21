import { getProgressForMonth, getMonthSummary, listMonthsWithData } from "@/db/queries/performance";
import { EntryView } from "@/components/entry/EntryView";
import { ExportButton } from "@/components/entry/ExportButton";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/shell/PageHeader";
import { parseMonthDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";

export default async function EntryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requirePermission("writeEntries");
    const params = await searchParams;
    const date = parseMonthDateParam(params.date);

    const [progress, summary, months] = await Promise.all([
        getProgressForMonth(date, user.scope, { includeInactive: true }),
        getMonthSummary(date, user.scope, { includeInactive: false }),
        listMonthsWithData(user.scope),
    ]);

    return (
        <div data-component="EntryPage" className="stack gap-5">
            <PageHeader
                title="Monthly entry"
                sub="Set each counsellor's monthly target (overall) and non-negotiable. Achieved is derived from daily admissions — expand a row and use “Manage daily admissions” to record those."
                actions={
                    <>
                        <MonthPicker date={date} existingMonths={months} basePath="/entry" />
                        <ExportButton date={date} />
                    </>
                }
            />
            <EntryView date={date} progress={progress} summary={summary} />
        </div>
    );
}
