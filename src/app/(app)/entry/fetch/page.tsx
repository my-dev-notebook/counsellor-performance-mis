import { listUsers } from "@/db/queries/users";
import { getAdmissionsForMonth } from "@/db/queries/dailyAdmissions";
import { AllCounsellorsFetchView } from "@/components/entry/AllCounsellorsFetchView";
import { parseMonthDateParam } from "@/schemas/dates";
import { requirePermission } from "@/lib/auth/session";

export default async function FetchAllPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const user = await requirePermission("writeEntries");
    const params = await searchParams;
    const date = parseMonthDateParam(params.date);

    const counsellors = await listUsers(user.scope, { includeInactive: false, roleNames: ["counsellor"] });
    // Every row of the month, not just these counsellors': rows held by
    // anyone else are how the diff spots an application it must not take.
    const admissions = await getAdmissionsForMonth(date);

    return (
        <div
            data-component="FetchAllPage"
            className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8"
        >
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Fetch all counsellors</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Pull every active counsellor&apos;s online-paid applicants for the month from Meritto, compare
                    with what is saved, and apply per counsellor or all at once.
                </p>
            </div>
            <AllCounsellorsFetchView key={date} date={date} counsellors={counsellors} admissions={admissions} />
        </div>
    );
}
