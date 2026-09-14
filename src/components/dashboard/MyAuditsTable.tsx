"use client";

import type { CallAuditRow } from "@/db/queries/callAudits";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { AqsPill } from "@/components/quality/AqsPill";
import {
    computeAqs,
    formatDuration,
    OVERALL_RATING_LABELS,
    PARAMETER_KEYS,
    PARAMETER_LABELS,
    RATING_LABELS,
} from "@/schemas/call-audit";
import type { Rating } from "@/schemas/call-audit";

const RATING_TONE: Record<Rating, string> = {
    pass: "text-success",
    fail: "text-destructive",
    na: "text-muted-foreground",
};

const COLUMNS: Column<CallAuditRow>[] = [
    {
        key: "period",
        header: "Period",
        className: "whitespace-nowrap text-muted-foreground tabular-nums",
        render: (a) => `${a.periodStart} → ${a.periodEnd}`,
    },
    {
        key: "callAt",
        header: "Call date",
        className: "whitespace-nowrap text-foreground tabular-nums",
        render: (a) => a.callAt,
    },
    { key: "phone", header: "Phone", className: "whitespace-nowrap text-muted-foreground tabular-nums", render: (a) => a.phone },
    {
        key: "aqs",
        header: "Quality score",
        className: "whitespace-nowrap",
        render: (a) => <AqsPill aqs={computeAqs(a.ratings)} />,
    },
];

/** Per-parameter breakdown shown under a clicked row. */
function AuditDetails({ audit }: { audit: CallAuditRow }) {
    return (
        <div data-component="AuditDetails" className="space-y-4 text-sm">
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
                <div>
                    <dt className="text-xs text-muted-foreground">Overall</dt>
                    <dd className="font-medium text-foreground">{OVERALL_RATING_LABELS[audit.overallRating]}</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">Duration</dt>
                    <dd className="text-foreground">{formatDuration(audit.durationSeconds)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">Audited by</dt>
                    <dd className="text-foreground">{audit.auditorName}</dd>
                </div>
            </dl>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-1 pr-4 font-medium">Parameter</th>
                        <th className="py-1 pr-4 font-medium">Score</th>
                        <th className="py-1 font-medium">Reason</th>
                    </tr>
                </thead>
                <tbody>
                    {PARAMETER_KEYS.map((key) => {
                        const rating = audit.ratings[key];
                        return (
                            <tr key={key} className="border-t border-border">
                                <td className="py-1.5 pr-4 text-foreground">{PARAMETER_LABELS[key]}</td>
                                <td className={`py-1.5 pr-4 font-medium ${RATING_TONE[rating]}`}>{RATING_LABELS[rating]}</td>
                                <td className="py-1.5 text-muted-foreground">{audit.reasons[key] || "—"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {audit.feedback && (
                <div>
                    <p className="text-xs text-muted-foreground">Feedback</p>
                    <p className="whitespace-pre-wrap text-foreground">{audit.feedback}</p>
                </div>
            )}
        </div>
    );
}

/** A counsellor's own call audits for the selected month; clicking a row shows every parameter's score. */
export function MyAuditsTable({ audits, monthLabel }: { audits: readonly CallAuditRow[]; monthLabel: string }) {
    return (
        <section data-component="MyAuditsTable" className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Call audits · {monthLabel}</h2>
            <DataTable
                columns={COLUMNS}
                rows={audits}
                rowKey={(a) => a.id}
                emptyMessage="No call audits for this month."
                renderExpanded={(a) => <AuditDetails audit={a} />}
            />
        </section>
    );
}
