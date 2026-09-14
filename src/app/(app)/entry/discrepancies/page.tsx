import { listAchievedDiscrepancies, listSnapshotDiscrepancies } from "@/db/queries/discrepancies";
import { listMonthsWithData } from "@/db/queries/performance";
import { DiscrepanciesView } from "@/components/entry/DiscrepanciesView";
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
        <div data-component="DiscrepanciesPage" className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Discrepancies</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Where a month&apos;s stored total disagrees with its daily admissions, or a month is filed under a
                    team the counsellor is no longer on. The stored figure is what the dashboards show; settle each row
                    by choosing which side is right.
                </p>
            </div>
            <DiscrepanciesView
                date={date}
                achieved={achieved}
                snapshots={snapshots}
                existingMonths={months}
                canManageRoster={user.permissions.manageRoster}
            />
        </div>
    );
}
