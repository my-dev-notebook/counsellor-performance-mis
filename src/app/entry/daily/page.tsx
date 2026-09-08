import { listCounsellors } from "@/db/queries/counsellors";
import { getDailyAdmissionsForMonth } from "@/db/queries/dailyAdmissions";
import { DailyEntryView } from "@/components/entry/DailyEntryView";

const MONTH_DATE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function currentMonthDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseDateParam(value: string | string[] | undefined): string {
    if (typeof value === "string" && MONTH_DATE_RE.test(value)) return value;
    return currentMonthDate();
}

function parseUserIdParam(value: string | string[] | undefined): number | null {
    if (typeof value !== "string") return null;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
}

export default async function DailyEntryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const date = parseDateParam(params.date);
    const userId = parseUserIdParam(params.userId);

    const counsellors = await listCounsellors({ includeInactive: false });
    const admissions = userId !== null ? await getDailyAdmissionsForMonth(userId, date) : [];
    const counsellor = userId !== null ? (counsellors.find((c) => c.id === userId) ?? null) : null;

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
                selectedUserId={userId}
                counsellorName={counsellor?.name ?? null}
                admissions={admissions}
            />
        </div>
    );
}
