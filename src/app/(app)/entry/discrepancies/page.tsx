import { listAchievedDiscrepancies, listSnapshotDiscrepancies } from "@/db/queries/discrepancies";
import { listMonthsWithData } from "@/db/queries/performance";
import { DiscrepanciesView } from "@/components/entry/DiscrepanciesView";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/shell/PageHeader";
import { parseMonthDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";

export default async function DiscrepanciesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requirePermission("writeEntries");
    const params = await searchParams;
    const date = parseMonthDateParam(params.date);

    const [achieved, snapshots, months] = await Promise.all([
        listAchievedDiscrepancies(date, user.scope),
        listSnapshotDiscrepancies(date, user.scope),
        listMonthsWithData(user.scope),
    ]);

    return (
        <div data-component="DiscrepanciesPage" className="stack gap-5">
            <PageHeader
                title="Discrepancies"
                sub="Where a month's stored total disagrees with its daily admissions, or a month is filed under a team the counsellor is no longer on. The stored figure is what the dashboards show; settle each row by choosing which side is right."
                actions={<MonthPicker date={date} existingMonths={months} basePath="/entry/discrepancies" />}
            />
            <DiscrepanciesView
                achieved={achieved}
                snapshots={snapshots}
                canManageRoster={user.permissions.manageRoster}
            />
        </div>
    );
}
