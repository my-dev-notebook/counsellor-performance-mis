"use client";

import type { CallAuditRow } from "@/db/queries/callAudits";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { AqsPill } from "@/components/quality/AqsPill";
import { AqsCell } from "@/components/quality/AqsCell";
import { BandLegend, statusAccent } from "@/components/StatusPill";
import {
    aqsStatus,
    computeAqs,
    formatDuration,
    OVERALL_RATING_LABELS,
    PARAMETER_KEYS,
    PARAMETER_LABELS,
    RATING_LABELS,
} from "@/schemas/call-audit";
import type { Rating } from "@/schemas/call-audit";

const RATING_TONE: Record<Rating, string> = {
    pass: "text-good-soft-fg",
    fail: "text-bad-soft-fg",
    na: "text-ink-3",
};

const COLUMNS: Column<CallAuditRow>[] = [
    {
        key: "period",
        header: "Period",
        className: "muted whitespace-nowrap t-num",
        render: (a) => `${a.periodStart} → ${a.periodEnd}`,
    },
    {
        key: "callAt",
        header: "Call date",
        className: "primary whitespace-nowrap t-num",
        render: (a) => a.callAt,
    },
    { key: "phone", header: "Phone", className: "muted whitespace-nowrap t-num", render: (a) => a.phone },
    {
        key: "aqs",
        header: "AQS",
        className: "num whitespace-nowrap",
        render: (a) => <AqsCell aqs={computeAqs(a.ratings)} />,
    },
];

/** Per-parameter breakdown shown under a clicked row. */
function AuditDetails({ audit }: { audit: CallAuditRow }) {
    return (
        <div data-component="AuditDetails" className="stack t-sm">
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-4">
                <div>
                    <dt className="t-caps">Quality score</dt>
                    <dd className="mt-0.5">
                        <AqsPill aqs={computeAqs(audit.ratings)} />
                    </dd>
                </div>
                <div>
                    <dt className="t-caps">Overall</dt>
                    <dd className="mt-0.5 font-medium">{OVERALL_RATING_LABELS[audit.overallRating]}</dd>
                </div>
                <div>
                    <dt className="t-caps">Duration</dt>
                    <dd className="t-num mt-0.5">{formatDuration(audit.durationSeconds)}</dd>
                </div>
                <div>
                    <dt className="t-caps">Audited by</dt>
                    <dd className="mt-0.5">{audit.auditorName}</dd>
                </div>
            </dl>
            <table className="w-full">
                <thead>
                    <tr className="text-left">
                        <th className="t-caps py-1 pr-4">Parameter</th>
                        <th className="t-caps py-1 pr-4">Score</th>
                        <th className="t-caps py-1">Reason</th>
                    </tr>
                </thead>
                <tbody>
                    {PARAMETER_KEYS.map((key) => {
                        const rating = audit.ratings[key];
                        return (
                            <tr key={key} className="border-t border-line-1">
                                <td className="py-1.5 pr-4">{PARAMETER_LABELS[key]}</td>
                                <td className={`py-1.5 pr-4 font-medium ${RATING_TONE[rating]}`}>
                                    {RATING_LABELS[rating]}
                                </td>
                                <td className="ink-3 py-1.5">{audit.reasons[key] || "—"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {audit.feedback && (
                <div>
                    <p className="t-caps">Feedback</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{audit.feedback}</p>
                </div>
            )}
        </div>
    );
}

/** A counsellor's own call audits for the selected month; clicking a row shows every parameter's score. */
export function MyAuditsTable({ audits, monthLabel }: { audits: readonly CallAuditRow[]; monthLabel: string }) {
    return (
        <section data-component="MyAuditsTable" className="stack gap-3">
            <h2 className="t-h3">Call audits · {monthLabel}</h2>
            <DataTable
                columns={COLUMNS}
                rows={audits}
                rowKey={(a) => a.id}
                emptyMessage="No call audits for this month."
                rowAccent={(a) => statusAccent(aqsStatus(computeAqs(a.ratings)))}
                footer={<BandLegend scale="aqs" />}
                renderExpanded={(a) => <AuditDetails audit={a} />}
            />
        </section>
    );
}
