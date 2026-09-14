import { listUsers } from "@/db/queries/users";
import { getDailyAdmissionsForMonth } from "@/db/queries/dailyAdmissions";
import { DailyEntryView } from "@/components/entry/DailyEntryView";
import { parseMonthDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";

function parseUserIdParam(value: string | string[] | undefined): number | null {
    if (typeof value !== "string") return null;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
}

export default async function DailyEntryPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await requirePermission("writeEntries");
    const params = await searchParams;
    const date = parseMonthDateParam(params.date);
    const userId = parseUserIdParam(params.userId);

    const counsellors = await listUsers(user.scope, { includeInactive: false, roleNames: ["counsellor"] });
    // Only a counsellor inside the scope can be opened; an arbitrary id in
    // the URL is ignored rather than read.
    const counsellor = userId !== null ? (counsellors.find((c) => c.id === userId) ?? null) : null;
    const admissions = counsellor ? await getDailyAdmissionsForMonth(counsellor.id, date) : [];

    return (
        <div
            data-component="DailyEntryPage"
            className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Daily Admissions Entry</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Record each admission with the lead&apos;s details. The daily count is derived automatically
                    from the number of records entered.
                </p>
            </div>
            <DailyEntryView
                date={date}
                counsellors={counsellors}
                selectedUserId={counsellor?.id ?? null}
                counsellorName={counsellor?.name ?? null}
                admissions={admissions}
            />
        </div>
    );
}
