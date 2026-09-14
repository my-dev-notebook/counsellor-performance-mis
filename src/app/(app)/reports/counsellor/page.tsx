import { getPersonHistory, listPeopleForSelector } from "@/db/queries/reports";
import { CounsellorSelector } from "@/components/reports/CounsellorSelector";
import { CounsellorHistoryChart } from "@/components/reports/CounsellorHistoryChart";
import { CounsellorHistoryTable } from "@/components/reports/CounsellorHistoryTable";
import { requireUser } from "@/lib/auth/session";

export default async function CounsellorReportPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requireUser();
    const params = await searchParams;
    const people = await listPeopleForSelector(user.scope);

    const requestedId = typeof params.userId === "string" ? Number.parseInt(params.userId, 10) : NaN;
    const userId = people.some((p) => p.userId === requestedId) ? requestedId : people[0]?.userId;

    const history = userId !== undefined ? await getPersonHistory(userId, user.scope) : [];
    const selected = people.find((p) => p.userId === userId);

    return (
        <div data-component="CounsellorReportPage" className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Counsellor History</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    One counsellor&apos;s Target/Achieved/% across every month on record, each month under the team
                    they were on at the time.
                </p>
            </div>
            {people.length > 1 && <CounsellorSelector people={people} selectedUserId={userId} />}
            {history.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    {selected ? "No recorded history for this counsellor." : "No counsellors found."}
                </p>
            ) : (
                <>
                    <CounsellorHistoryChart points={history} />
                    <CounsellorHistoryTable points={history} />
                </>
            )}
        </div>
    );
}
