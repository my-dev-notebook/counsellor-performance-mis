"use client";

import { useState, useTransition } from "react";
import {
    setManualAchievedAction,
    updateRosterFromSnapshotAction,
    revertToLiveCountAction,
    applyRosterAssignmentAction,
} from "@/app/(app)/entry/discrepancies/actions";
import type { AchievedDiscrepancy, SnapshotDiscrepancy } from "@/db/queries/discrepancies";
import { formatInt, formatText } from "@/lib/format";
import { MonthPicker } from "@/components/MonthPicker";
import { DataTable } from "@/components/DataTable";
import type { Column } from "@/components/DataTable";

const BUTTON = "rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
const INPUT = "w-20 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";

const SOURCE_LABELS = { admissions: "finalize", import: "import", manual: "manual" } as const;

function AchievedActions({ row }: { row: AchievedDiscrepancy }) {
    const [pending, startTransition] = useTransition();
    const [manual, setManual] = useState("");
    const [error, setError] = useState<string | null>(null);
    const run = (action: () => Promise<void>) => {
        setError(null);
        startTransition(async () => {
            try {
                await action();
            } catch {
                setError("Could not save. Try again.");
            }
        });
    };
    const manualValue = Number.parseInt(manual, 10);
    return (
        <div data-component="AchievedActions" className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                className={BUTTON}
                disabled={pending}
                onClick={() => {
                    run(() => revertToLiveCountAction(row.userId, row.date));
                }}
            >
                Use live count ({formatInt(row.live)})
            </button>
            <input
                type="number"
                min={0}
                placeholder="Manual"
                value={manual}
                disabled={pending}
                onChange={(e) => {
                    setManual(e.target.value);
                }}
                className={INPUT}
                aria-label={`Manual achieved for ${row.userName}`}
            />
            <button
                type="button"
                className={BUTTON}
                disabled={pending || !Number.isFinite(manualValue) || manualValue < 0}
                onClick={() => {
                    run(() => setManualAchievedAction(row.userId, row.date, manualValue));
                }}
            >
                Set
            </button>
            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    );
}

function SnapshotActions({ row, canManageRoster }: { row: SnapshotDiscrepancy; canManageRoster: boolean }) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const run = (action: () => Promise<void>) => {
        setError(null);
        startTransition(async () => {
            try {
                await action();
            } catch {
                setError("Could not save. Try again.");
            }
        });
    };
    return (
        <div data-component="SnapshotActions" className="flex flex-wrap items-center gap-2">
            <button
                type="button"
                className={BUTTON}
                disabled={pending || row.rosterTeamId === null}
                onClick={() => {
                    run(() => applyRosterAssignmentAction(row.userId, row.date));
                }}
            >
                File month under roster team
            </button>
            {canManageRoster && (
                <button
                    type="button"
                    className={BUTTON}
                    disabled={pending}
                    onClick={() => {
                        run(() => updateRosterFromSnapshotAction(row.userId, row.date));
                    }}
                >
                    Move user to month&apos;s team
                </button>
            )}
            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    );
}

export function DiscrepanciesView({
    date,
    achieved,
    snapshots,
    existingMonths,
    canManageRoster,
}: {
    date: string;
    achieved: AchievedDiscrepancy[];
    snapshots: SnapshotDiscrepancy[];
    existingMonths: string[];
    canManageRoster: boolean;
}) {
    const achievedColumns: Column<AchievedDiscrepancy>[] = [
        { key: "name", header: "Counsellor", render: (r) => <span className="font-medium text-foreground">{r.userName}</span> },
        { key: "team", header: "Team", className: "text-muted-foreground", render: (r) => formatText(r.teamName) },
        {
            key: "stored",
            header: "Stored",
            className: "text-right whitespace-nowrap",
            render: (r) => (
                <span>
                    <span className="font-medium text-foreground">{formatInt(r.stored)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                        via {SOURCE_LABELS[r.source]}
                        {r.importFileName ? ` (${r.importFileName})` : ""}
                    </span>
                </span>
            ),
        },
        { key: "live", header: "Daily count", className: "text-right", render: (r) => formatInt(r.live) },
        {
            key: "diff",
            header: "Diff",
            className: "text-right",
            render: (r) => (
                <span className={r.stored - r.live > 0 ? "text-success" : "text-destructive"}>
                    {r.stored - r.live > 0 ? "+" : ""}
                    {formatInt(r.stored - r.live)}
                </span>
            ),
        },
        { key: "actions", header: "", srLabel: "Resolve", render: (r) => <AchievedActions row={r} /> },
    ];

    const snapshotColumns: Column<SnapshotDiscrepancy>[] = [
        {
            key: "name",
            header: "Counsellor",
            render: (r) => (
                <span className="font-medium text-foreground">
                    {r.userName}
                    {!r.isActive && <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>}
                </span>
            ),
        },
        {
            key: "snapshot",
            header: "Month filed under",
            render: (r) => `${formatText(r.snapshotTeamName)} · ${formatText(r.snapshotAgencyName)}`,
        },
        {
            key: "roster",
            header: "Roster now",
            render: (r) => `${formatText(r.rosterTeamName)} · ${formatText(r.rosterAgencyName)}`,
        },
        {
            key: "actions",
            header: "",
            srLabel: "Resolve",
            render: (r) => <SnapshotActions row={r} canManageRoster={canManageRoster} />,
        },
    ];

    return (
        <div data-component="DiscrepanciesView" className="space-y-8">
            <MonthPicker date={date} existingMonths={existingMonths} basePath="/entry/discrepancies" />

            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Achieved: stored total vs daily admissions</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        &quot;Use live count&quot; drops the stored total so the month follows the daily rows again. A manual
                        figure is kept until changed here; finalize never overwrites it.
                    </p>
                </div>
                <DataTable
                    columns={achievedColumns}
                    rows={achieved}
                    rowKey={(r) => r.userId}
                    emptyMessage="Every stored total matches its daily admissions for this month."
                />
            </section>

            <section className="space-y-3">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Team snapshot vs roster</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        A month keeps the team it was recorded under. That is usually right after a mid-year move; fix it
                        only if the month is filed under the wrong team.
                    </p>
                </div>
                <DataTable
                    columns={snapshotColumns}
                    rows={snapshots}
                    rowKey={(r) => r.userId}
                    emptyMessage="Every month is filed under the counsellor's current team and agency."
                />
            </section>
        </div>
    );
}
