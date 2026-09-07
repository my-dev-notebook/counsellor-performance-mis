"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MonthSummary, ProgressRow } from "@/db/types";
import { formatInt } from "@/lib/format";
import { EntryRow } from "@/components/entry/EntryRow";
import { ExportButton } from "@/components/entry/ExportButton";

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

type StatusFilter = "all" | "filled" | "pending" | "flagged";

function MonthPicker({
    year,
    month,
    existingMonths,
}: {
    year: number;
    month: number;
    existingMonths: { year: number; month: number }[];
}) {
    const router = useRouter();

    const navigate = (y: number, m: number) => {
        router.push(`/entry?year=${String(y)}&month=${String(m)}`);
    };

    return (
        <div data-component="MonthPicker" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Month
                <select
                    value={month}
                    onChange={(e) => {
                        navigate(year, Number(e.target.value));
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                >
                    {MONTH_NAMES.map((name, i) => (
                        <option key={name} value={i + 1}>
                            {name}
                        </option>
                    ))}
                </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Year
                <input
                    type="number"
                    value={year}
                    onChange={(e) => {
                        const y = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(y)) navigate(y, month);
                    }}
                    className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
            </label>
            {existingMonths.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Existing:</span>
                    {existingMonths.map((m) => (
                        <button
                            key={`${String(m.year)}-${String(m.month)}`}
                            type="button"
                            onClick={() => {
                                navigate(m.year, m.month);
                            }}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                m.year === year && m.month === month
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                        >
                            {MONTH_NAMES[m.month - 1]?.slice(0, 3)} {m.year}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

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
                <p className="mt-1 text-xs text-muted-foreground">excludes flagged entries</p>
            </div>
        </div>
    );
}

export function EntryView({
    year,
    month,
    progress,
    summary,
    existingMonths,
}: {
    year: number;
    month: number;
    progress: ProgressRow[];
    summary: MonthSummary;
    existingMonths: { year: number; month: number }[];
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
            if (statusFilter === "flagged" && !row.entry?.achievedFlagged) return false;
            return true;
        });
    }, [progress, search, statusFilter, showInactive]);

    return (
        <div data-component="EntryView" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <MonthPicker year={year} month={month} existingMonths={existingMonths} />
                <ExportButton year={year} month={month} />
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
                    {(["all", "pending", "filled", "flagged"] as const).map((s) => (
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
                                <EntryRow key={row.counsellor.id} row={row} year={year} month={month} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
