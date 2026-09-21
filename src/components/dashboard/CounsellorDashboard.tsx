"use client";

import { useState } from "react";
import type { ParsedWorkbook } from "@/schemas/parser";
import type { AdmissionRow } from "@/db/types";
import { KpiCards } from "@/components/kpi/KpiCards";
import { PersonalKpis } from "@/components/dashboard/PersonalKpis";
import { AdmissionsCalendar } from "@/components/dashboard/AdmissionsCalendar";

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
 * aggregate under "My team" (the workbook's `counsellors` holds only their
 * own row; `teams` carries the whole team's totals). The calendar shows the
 * month's daily admissions and is monthly-only — the yearly page passes none.
 * Call audits live on /quality/mine.
 */
export function CounsellorDashboard({
    workbook,
    userId,
    monthDate,
    admissions,
}: {
    workbook: ParsedWorkbook;
    userId: number;
    monthDate?: string;
    admissions?: readonly AdmissionRow[];
}) {
    const [view, setView] = useState<View>("me");

    const me = workbook.counsellors.find((c) => c.id === String(userId));
    const team = me ? workbook.teams.find((t) => t.team === me.team) : workbook.teams[0];

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
                <section className="stack gap-3">
                    <h2 className="t-h3">Team · {team.team}</h2>
                    <KpiCards summary={team} />
                </section>
            ) : (
                <div className="card">
                    <p className="empty">No team data for this period.</p>
                </div>
            )}
            {monthDate !== undefined && admissions !== undefined && view === "me" && (
                <AdmissionsCalendar monthDate={monthDate} admissions={admissions} />
            )}
        </div>
    );
}
