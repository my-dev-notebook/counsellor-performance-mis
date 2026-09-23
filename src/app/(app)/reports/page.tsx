import type { SelectOption } from "@/components/Select";
import { SubjectSelector } from "@/components/reports/SubjectSelector";
import { TrendCharts } from "@/components/reports/TrendCharts";
import type { TrendPoint } from "@/components/reports/TrendCharts";
import { DailyChart } from "@/components/reports/DailyChart";
import { CounsellorHistoryTable } from "@/components/reports/CounsellorHistoryTable";
import { MonthPicker } from "@/components/MonthPicker";
import { PageHeader } from "@/components/shell/PageHeader";
import {
    getCompanyMonthlySeries,
    getDailyCounts,
    getPersonHistory,
    getTeamMonthlyPoints,
    listPeopleForSelector,
} from "@/db/queries/reports";
import type { PersonHistoryPoint } from "@/db/queries/reports";
import { listMonthsWithData } from "@/db/queries/performance";
import { listTeams } from "@/db/queries/teams";
import { requirePermission } from "@/lib/auth/session";
import type { CurrentUser } from "@/lib/auth/session";
import { decodeSubject, encodeSubject } from "@/lib/reports/subject";
import type { Subject } from "@/lib/reports/subject";
import { currentMonthDate, parseMonthDateParam } from "@/schemas/dates";

interface SubjectOption {
    subject: Subject;
    label: string;
    /** Team name, for team subjects (the monthly series is keyed by name). */
    teamName?: string;
}

/**
 * What the reader may pick: everything for an all-teams scope, own team plus
 * its people for a team leader, "Me" and "My team" for a counsellor. The
 * first option is the default.
 */
async function subjectOptions(user: CurrentUser): Promise<SubjectOption[]> {
    const { scope } = user;
    switch (scope.kind) {
        case "all": {
            const [teams, people] = await Promise.all([listTeams(), listPeopleForSelector(scope)]);
            return [
                { subject: { kind: "company" }, label: "Company" },
                ...teams.map((t): SubjectOption => ({
                    subject: { kind: "team", teamId: t.id },
                    label: `Team · ${t.name}`,
                    teamName: t.name,
                })),
                ...people.map((p): SubjectOption => ({ subject: { kind: "person", userId: p.userId }, label: p.name })),
            ];
        }
        case "team": {
            const [teams, people] = await Promise.all([listTeams(), listPeopleForSelector(scope)]);
            const team = teams.find((t) => t.id === scope.teamId);
            const options: SubjectOption[] = [];
            if (team)
                options.push({ subject: { kind: "team", teamId: team.id }, label: "My team", teamName: team.name });
            for (const p of people) options.push({ subject: { kind: "person", userId: p.userId }, label: p.name });
            return options;
        }
        case "self": {
            const options: SubjectOption[] = [{ subject: { kind: "person", userId: scope.userId }, label: "Me" }];
            if (scope.teamId !== null) {
                const team = (await listTeams()).find((t) => t.id === scope.teamId);
                if (team)
                    options.push({ subject: { kind: "team", teamId: team.id }, label: "My team", teamName: team.name });
            }
            return options;
        }
        case "none":
            return [];
    }
}

export default async function ReportsOverviewPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const user = await requirePermission("viewPerformance");
    const params = await searchParams;

    const options = await subjectOptions(user);
    const requested = decodeSubject(params.subject);
    const requestedKey = requested ? encodeSubject(requested) : null;
    const selected = options.find((o) => encodeSubject(o.subject) === requestedKey) ?? options[0];

    const months = await listMonthsWithData(user.scope);
    const date = parseMonthDateParam(params.date, months[0] ?? currentMonthDate());

    let trend: TrendPoint[] = [];
    let history: PersonHistoryPoint[] = [];
    if (selected) {
        switch (selected.subject.kind) {
            case "company":
                trend = await getCompanyMonthlySeries(user.scope);
                break;
            case "team":
                trend = await getTeamMonthlyPoints(selected.teamName ?? "", user.scope);
                break;
            case "person":
                history = await getPersonHistory(selected.subject.userId, user.scope);
                trend = history;
                break;
        }
    }
    const daily = selected ? await getDailyCounts(date, selected.subject, user.scope) : [];

    const selectOptions: SelectOption[] = options.map((o) => ({ value: encodeSubject(o.subject), label: o.label }));

    return (
        <div data-component="ReportsOverviewPage" className="stack gap-5">
            <PageHeader
                title="Overview"
                sub="Month-by-month Target, Achieved and Achievement % across every month on record, plus the daily successful applications of one month."
            />
            {options.length > 1 && selected && (
                <SubjectSelector options={selectOptions} value={encodeSubject(selected.subject)} />
            )}
            {!selected ? (
                <div className="card">
                    <p className="empty">Nothing to report on yet.</p>
                </div>
            ) : (
                <>
                    <section className="stack gap-3">
                        <h2 className="t-h3">Monthly — {selected.label}</h2>
                        <TrendCharts points={trend} />
                        {selected.subject.kind === "person" && history.length > 0 && (
                            <CounsellorHistoryTable points={history} />
                        )}
                    </section>
                    <section className="stack gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="t-h3">Daily — {selected.label}</h2>
                            <MonthPicker date={date} existingMonths={months} basePath="/reports" />
                        </div>
                        <DailyChart points={daily} monthDate={date} />
                    </section>
                </>
            )}
        </div>
    );
}
