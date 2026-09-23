"use client";

import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import type { ParsedWorkbook } from "@/schemas/parser";
import type { SuccessfulApplicationRow } from "@/db/types";
import { KpiCards } from "@/components/kpi/KpiCards";
import { PersonalKpis } from "@/components/dashboard/PersonalKpis";
import { SuccessfulApplicationsCalendar } from "@/components/dashboard/SuccessfulApplicationsCalendar";
import { CounsellorTable } from "@/components/table/CounsellorTable";
import { SessionHeatmap } from "@/components/dashboard/SessionHeatmap";
import type { DailyCount } from "@/components/dashboard/SessionHeatmap";

type View = "me" | "team";

const VIEWS: { value: View; label: string }[] = [
    { value: "me", label: "My performance" },
    { value: "team", label: "My team" },
];

function ViewToggle({ value, onChange }: { value: View; onChange: (view: View) => void }) {
    return (
        <div data-component="ViewToggle" role="tablist" className="segmented">
            {VIEWS.map((view) => (
                <button
                    key={view.value}
                    type="button"
                    role="tab"
                    aria-selected={value === view.value}
                    onClick={() => {
                        onChange(view.value);
                    }}
                >
                    {view.label}
                </button>
            ))}
        </div>
    );
}

/**
 * A counsellor's own home: their row under "My performance", their team's
 * aggregate and every teammate's row under "My team" (the workbook is loaded
 * with `includeTeammates`, so `counsellors` holds the team's rows; `teams`
 * carries the whole team's totals). The calendar shows the
 * month's daily successful applications and is monthly-only; the yearly page passes the
 * session's daily counts instead, drawn as a year-long heatmap.
 * Call audits live on /quality/mine.
 */
export function CounsellorDashboard({
    workbook,
    userId,
    monthDate,
    successfulApplications,
    session,
}: {
    workbook: ParsedWorkbook;
    userId: number;
    monthDate?: string;
    successfulApplications?: readonly SuccessfulApplicationRow[];
    session?: { year: string; days: readonly DailyCount[] };
}) {
    const [view, setView] = useState<View>("me");
    const [search, setSearch] = useState("");

    const me = workbook.counsellors.find((c) => c.id === String(userId));
    const team = me ? workbook.teams.find((t) => t.team === me.team) : workbook.teams[0];

    const teammates = useMemo(
        () => (team ? workbook.counsellors.filter((c) => c.team === team.team) : []),
        [workbook, team],
    );
    const searched = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q === "" ? teammates : teammates.filter((c) => c.name.toLowerCase().includes(q));
    }, [teammates, search]);

    return (
        <div data-component="CounsellorDashboard" className="stack gap-5">
            <ViewToggle value={view} onChange={setView} />
            {view === "me" ? (
                me ? (
                    <PersonalKpis counsellor={me} />
                ) : (
                    <div className="card">
                        <p className="empty">No entry recorded for you in this period.</p>
                    </div>
                )
            ) : team ? (
                <>
                    <section className="stack gap-3">
                        <h2 className="t-h3">Team · {team.team}</h2>
                        <KpiCards summary={team} />
                    </section>
                    <section className="stack gap-3">
                        <div className="row justify-between">
                            <h2 className="t-h3">Counsellors</h2>
                            <div className="input-wrap w-60">
                                <FiSearch className="lead" aria-hidden />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                    }}
                                    placeholder="Search counsellors…"
                                    aria-label="Search counsellors"
                                    className="input input-sm"
                                />
                            </div>
                        </div>
                        <CounsellorTable counsellors={searched} />
                    </section>
                </>
            ) : (
                <div className="card">
                    <p className="empty">No team data for this period.</p>
                </div>
            )}
            {monthDate !== undefined && successfulApplications !== undefined && view === "me" && (
                <SuccessfulApplicationsCalendar monthDate={monthDate} successfulApplications={successfulApplications} />
            )}
            {session !== undefined && view === "me" && (
                <SessionHeatmap sessionYear={session.year} days={session.days} />
            )}
        </div>
    );
}
