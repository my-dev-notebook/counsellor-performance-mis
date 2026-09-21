import { listUsers } from "@/db/queries/users";
import { getAdmissionsForMonth } from "@/db/queries/dailyAdmissions";
import { AllCounsellorsFetchView } from "@/components/entry/AllCounsellorsFetchView";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/shell/PageHeader";
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
        <div data-component="FetchAllPage" className="stack gap-5">
            <PageHeader
                title="Fetch all counsellors"
                sub="Pull every active counsellor's online-paid applicants for the month from Meritto, compare with what is saved, and apply per counsellor or all at once."
                actions={<MonthPicker date={date} existingMonths={[]} basePath="/entry/fetch" />}
            />
            <AllCounsellorsFetchView key={date} date={date} counsellors={counsellors} admissions={admissions} />
        </div>
    );
}
