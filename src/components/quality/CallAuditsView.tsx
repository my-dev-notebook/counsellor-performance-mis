"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CallAuditRow } from "@/db/queries/callAudits";
import type { Team, UserRow } from "@/db/types";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";
import { Select } from "@/components/Select";
import { AqsPill } from "@/components/quality/AqsPill";
import { QualityExportButton } from "@/components/quality/QualityExportButton";
import { computeAqs, formatDuration, OVERALL_RATING_LABELS } from "@/schemas/call-audit";
import { formatText } from "@/lib/format";

const COLUMNS: Column<CallAuditRow>[] = [
    {
        key: "callAt",
        header: "Call",
        className: "whitespace-nowrap text-muted-foreground tabular-nums",
        render: (a) => a.callAt,
    },
    {
        key: "counsellor",
        header: "Counsellor",
        className: "font-medium text-foreground",
        render: (a) => a.counsellorName,
    },
    { key: "team", header: "Team", className: "text-muted-foreground", render: (a) => a.teamName },
    {
        key: "period",
        header: "Period",
        className: "whitespace-nowrap text-muted-foreground tabular-nums",
        render: (a) => `${a.periodStart} → ${a.periodEnd}`,
    },
    {
        key: "duration",
        header: "Duration",
        className: "whitespace-nowrap text-muted-foreground",
        render: (a) => formatDuration(a.durationSeconds),
    },
    {
        key: "application",
        header: "Application ID",
        className: "text-muted-foreground",
        render: (a) => formatText(a.applicationId),
    },
    {
        key: "aqs",
        header: "AQS",
        className: "whitespace-nowrap",
        render: (a) => <AqsPill aqs={computeAqs(a.ratings)} />,
    },
    {
        key: "overall",
        header: "Overall",
        className: "whitespace-nowrap text-muted-foreground",
        render: (a) => OVERALL_RATING_LABELS[a.overallRating],
    },
    { key: "auditor", header: "Audited by", className: "text-muted-foreground", render: (a) => a.auditorName },
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
        <div data-component="CallAuditsView" className="space-y-4">
            <QualityExportButton />
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Team
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
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    Counsellor
                    <Select
                        value={userId}
                        onChange={setUserId}
                        options={counsellorOptions}
                        size="sm"
                        aria-label="Filter by counsellor"
                    />
                </label>
                <span className="ml-auto text-xs text-muted-foreground">
                    {rows.length} of {audits.length} audits
                </span>
            </div>
            <DataTable
                columns={COLUMNS}
                rows={rows}
                rowKey={(a) => a.id}
                emptyMessage="No call audits yet."
                onRowClick={(a) => {
                    router.push(`/quality/${String(a.id)}`);
                }}
            />
        </div>
    );
}
