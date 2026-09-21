"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CallAuditRow } from "@/db/queries/callAudits";
import type { Team, UserRow } from "@/db/types";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { Select } from "@/components/Select";
import { BandLegend, statusAccent } from "@/components/StatusPill";
import { AqsCell } from "@/components/quality/AqsCell";
import { QualityExportButton } from "@/components/quality/QualityExportButton";
import { aqsStatus, computeAqs, formatDuration, OVERALL_RATING_LABELS } from "@/schemas/call-audit";
import { formatText } from "@/lib/format";

const COLUMNS: Column<CallAuditRow>[] = [
    {
        key: "callAt",
        header: "Call",
        className: "muted t-num whitespace-nowrap",
        render: (a) => a.callAt,
    },
    {
        key: "counsellor",
        header: "Counsellor",
        className: "primary",
        render: (a) => a.counsellorName,
    },
    { key: "team", header: "Team", className: "muted", render: (a) => a.teamName },
    {
        key: "period",
        header: "Period",
        className: "muted t-num whitespace-nowrap",
        render: (a) => `${a.periodStart} → ${a.periodEnd}`,
    },
    {
        key: "duration",
        header: "Duration",
        className: "muted whitespace-nowrap",
        render: (a) => formatDuration(a.durationSeconds),
    },
    {
        key: "application",
        header: "Application ID",
        className: "muted",
        render: (a) => formatText(a.applicationId),
    },
    {
        key: "aqs",
        header: "AQS",
        className: "num whitespace-nowrap",
        render: (a) => <AqsCell aqs={computeAqs(a.ratings)} />,
    },
    {
        key: "overall",
        header: "Overall",
        className: "muted whitespace-nowrap",
        render: (a) => OVERALL_RATING_LABELS[a.overallRating],
    },
    { key: "auditor", header: "Audited by", className: "muted", render: (a) => a.auditorName },
];

export function CallAuditsView({
    audits,
    counsellors,
    teams,
}: {
    audits: CallAuditRow[];
    counsellors: UserRow[];
    teams: Team[];
}) {
    const router = useRouter();
    const [teamId, setTeamId] = useState("");
    const [userId, setUserId] = useState("");

    const counsellorOptions = useMemo(
        () => [
            { value: "", label: "All counsellors" },
            ...counsellors
                .filter((c) => teamId === "" || String(c.teamId) === teamId)
                .map((c) => ({ value: String(c.id), label: c.name })),
        ],
        [counsellors, teamId],
    );
    const teamOptions = useMemo(
        () => [{ value: "", label: "All teams" }, ...teams.map((t) => ({ value: String(t.id), label: t.name }))],
        [teams],
    );

    const rows = useMemo(
        () =>
            audits.filter(
                (a) => (teamId === "" || String(a.teamId) === teamId) && (userId === "" || String(a.userId) === userId),
            ),
        [audits, teamId, userId],
    );

    return (
        <div data-component="CallAuditsView" className="stack gap-4">
            <QualityExportButton />
            <div className="card card-pad flex flex-wrap items-end gap-x-4 gap-y-3">
                <label className="field w-48">
                    <span className="label">Team</span>
                    <Select
                        value={teamId}
                        onChange={(v) => {
                            setTeamId(v);
                            setUserId("");
                        }}
                        options={teamOptions}
                        size="sm"
                        aria-label="Filter by team"
                    />
                </label>
                <label className="field w-56">
                    <span className="label">Counsellor</span>
                    <Select
                        value={userId}
                        onChange={setUserId}
                        options={counsellorOptions}
                        size="sm"
                        aria-label="Filter by counsellor"
                    />
                </label>
                <span className="t-xs ink-3 ml-auto">
                    {rows.length} of {audits.length} audits
                </span>
            </div>
            <DataTable
                columns={COLUMNS}
                rows={rows}
                rowKey={(a) => a.id}
                emptyMessage="No call audits yet."
                rowAccent={(a) => statusAccent(aqsStatus(computeAqs(a.ratings)))}
                footer={<BandLegend scale="aqs" />}
                onRowClick={(a) => {
                    router.push(`/quality/${String(a.id)}`);
                }}
            />
        </div>
    );
}
