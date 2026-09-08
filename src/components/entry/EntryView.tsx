"use client";

import { useMemo, useState } from "react";
import type { MonthSummary, ProgressRow } from "@/db/types";
import { formatInt } from "@/lib/format";
import { MonthPicker } from "@/components/MonthPicker";
import { EntryRow } from "@/components/entry/EntryRow";
import { ExportButton } from "@/components/entry/ExportButton";

type StatusFilter = "all" | "filled" | "pending";

function SummaryBar({ summary }: { summary: MonthSummary }) {
    return (
        <div data-component="SummaryBar" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Filled</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                    {summary.filledCount} / {summary.totalCount}
                </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Target so far</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{formatInt(summary.targetSoFar)}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Achieved so far</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{formatInt(summary.achievedSoFar)}</p>
            </div>
        </div>
    );
}

export function EntryView({
    date,
    progress,
    summary,
    existingMonths,
}: {
    date: string;
    progress: ProgressRow[];
    summary: MonthSummary;
    existingMonths: string[];
}) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [showInactive, setShowInactive] = useState(false);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return progress.filter((row) => {
            if (!showInactive && !row.counsellor.isActive) return false;
            if (
                q !== "" &&
                !row.counsellor.name.toLowerCase().includes(q) &&
                !row.counsellor.teamName.toLowerCase().includes(q) &&
                !(row.counsellor.agencyName?.toLowerCase().includes(q) ?? false)
            ) {
                return false;
            }
            if (statusFilter === "filled" && row.entry === null) return false;
            if (statusFilter === "pending" && row.entry !== null) return false;
            return true;
        });
    }, [progress, search, statusFilter, showInactive]);

    return (
        <div data-component="EntryView" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <MonthPicker date={date} existingMonths={existingMonths} basePath="/entry" />
                <ExportButton date={date} />
            </div>

            <SummaryBar summary={summary} />

            <div className="flex flex-wrap items-center gap-3">
                <input
                    placeholder="Search by name, team, agency…"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                />
                <div className="flex gap-1">
                    {(["all", "pending", "filled"] as const).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => {
                                setStatusFilter(s);
                            }}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                                statusFilter === s
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => {
                            setShowInactive(e.target.checked);
                        }}
                    />
                    Include inactive (back-filling)
                </label>
            </div>

            {filtered.length === 0 ? (
                <p data-component="EntryView" className="py-8 text-center text-sm text-muted-foreground">
                    No counsellors match the current filters.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-card">
                    <table className="min-w-full divide-y divide-border text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                {["Counsellor", "Team", "Agency", "Status"].map((h) => (
                                    <th
                                        key={h}
                                        className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map((row) => (
                                <EntryRow key={row.counsellor.id} row={row} date={date} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
