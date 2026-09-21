import { redirect } from "next/navigation";
import { listCallAudits } from "@/db/queries/callAudits";
import { listMonthsWithData } from "@/db/queries/performance";
import { MonthPicker } from "@/components/MonthPicker";
import { MyAuditsTable } from "@/components/dashboard/MyAuditsTable";
import { formatMonthLabel } from "@/lib/format";
import { PageHeader } from "@/components/shell/PageHeader";
import { requireUser } from "@/lib/auth/session";
import { currentMonthDate, parseMonthDateParam } from "@/schemas/dates";

/** A counsellor's own call audits, one month at a time. Anyone with a wider scope has /quality instead. */
export default async function MyAuditsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requireUser();
    if (user.scope.kind !== "self") redirect(user.permissions.auditCalls ? "/quality" : "/");

    const params = await searchParams;
    const months = await listMonthsWithData(user.scope);
    const date = parseMonthDateParam(params.date, months[0] ?? currentMonthDate());
    // callAt is "YYYY-MM-DD HH:MM"; the ISO prefix keeps every call in the month inside [from, to].
    const audits = await listCallAudits(user.scope, { userId: user.id, from: `${date}-01`, to: `${date}-31 23:59` });

    return (
        <div data-component="MyAuditsPage" className="stack gap-5">
            <PageHeader
                title="My audits"
                sub="Call audits the Quality Analyst recorded for you. Click a row to see the score on each parameter."
                actions={<MonthPicker date={date} existingMonths={months} basePath="/quality/mine" />}
            />
            <MyAuditsTable audits={audits} monthLabel={formatMonthLabel(date)} />
        </div>
    );
}
