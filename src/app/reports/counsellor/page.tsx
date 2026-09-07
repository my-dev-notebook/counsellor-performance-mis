import { getPersonHistory, listPeopleForSelector } from "@/db/queries/reports";
import { CounsellorSelector } from "@/components/reports/CounsellorSelector";
import { CounsellorHistoryChart } from "@/components/reports/CounsellorHistoryChart";
import { CounsellorHistoryTable } from "@/components/reports/CounsellorHistoryTable";

export default async function CounsellorReportPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const people = await listPeopleForSelector();

    const requestedId = typeof params.personId === "string" ? Number.parseInt(params.personId, 10) : NaN;
    const personId = people.some((p) => p.personId === requestedId) ? requestedId : people[0]?.personId;

    const history = personId !== undefined ? await getPersonHistory(personId) : [];
    const selected = people.find((p) => p.personId === personId);

    return (
        <div data-component="CounsellorReportPage" className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">Counsellor History</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    One counsellor&apos;s Target/Achieved/% across every month on record, across every team they&apos;ve
                    been assigned to.
                </p>
            </div>
            <CounsellorSelector people={people} selectedPersonId={personId} />
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
