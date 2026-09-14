"use client";

import { useState } from "react";
import type { CommitOutcome } from "@/db/queries/imports";
import type { RowStatus } from "@/lib/import/decisions";
import { formatMonthLabel } from "@/lib/format";
import type { BulkActions } from "@/components/upload/import/ImportFilterBar";

const BUTTON =
    "rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
    return (
        <div data-component="Stat" className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className={`mt-1 text-xl font-semibold ${tone || "text-foreground"}`}>{value}</p>
        </div>
    );
}

export function ImportSummary({
    counts,
    total,
    planning,
    committing,
    committable,
    bulk,
    onCommit,
    date,
    error,
}: {
    counts: Record<RowStatus, number>;
    total: number;
    planning: boolean;
    committing: boolean;
    committable: boolean;
    bulk: BulkActions;
    onCommit: () => void;
    date: string;
    error: Exclude<CommitOutcome, { ok: true }> | null;
}) {
    const [includeSnapshots, setIncludeSnapshots] = useState(false);
    const attention =
        counts["team-unmapped"] +
        counts["agency-unmapped"] +
        counts.unresolved +
        counts.confirm +
        counts.conflict +
        counts.invalid;
    const willWrite = counts.insert + counts.update + counts.create;

    return (
        <section data-component="ImportSummary" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Rows" value={total} />
                <Stat
                    label="Needs attention"
                    value={attention}
                    tone={attention > 0 ? "text-warning" : "text-success"}
                />
                <Stat label="New entries" value={counts.insert} />
                <Stat label="Updates" value={counts.update} />
                <Stat label="New users" value={counts.create} />
                <Stat label="No change / skipped" value={counts["no-change"] + counts.skip} />
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
                <button
                    type="button"
                    className={BUTTON}
                    disabled={planning || committing || counts.confirm === 0}
                    onClick={bulk.confirmLikely}
                >
                    Confirm all suggested matches ({counts.confirm})
                </button>
                <button
                    type="button"
                    className={BUTTON}
                    disabled={planning || committing || counts.conflict === 0}
                    onClick={() => {
                        bulk.resolveConflicts("sheet", includeSnapshots);
                    }}
                >
                    Take sheet for all conflicts ({counts.conflict})
                </button>
                <button
                    type="button"
                    className={BUTTON}
                    disabled={planning || committing || counts.conflict === 0}
                    onClick={() => {
                        bulk.resolveConflicts("keep", false);
                    }}
                >
                    Keep DB for all conflicts
                </button>
                <button
                    type="button"
                    className={BUTTON}
                    disabled={planning || committing || counts.invalid === 0}
                    onClick={bulk.fillDefaultEmails}
                >
                    Fill default emails ({counts.invalid})
                </button>
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <input
                        type="checkbox"
                        checked={includeSnapshots}
                        onChange={(e) => {
                            setIncludeSnapshots(e.target.checked);
                        }}
                    />
                    &quot;Take sheet&quot; also rewrites team snapshots
                </label>
            </div>

            {error && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error.kind === "stale"
                        ? `The month changed while you were reviewing (${String(error.rowIds.length)} row${error.rowIds.length === 1 ? "" : "s"}). The rows have been re-matched; please review and commit again.`
                        : error.message}
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {planning
                        ? "Matching rows against the roster…"
                        : attention > 0
                          ? `${String(attention)} row${attention === 1 ? "" : "s"} still need${attention === 1 ? "s" : ""} a decision before you can commit.`
                          : `${String(willWrite)} row${willWrite === 1 ? "" : "s"} will be written to ${formatMonthLabel(date)}.`}
                </p>
                <button
                    type="button"
                    disabled={!committable || willWrite === 0}
                    onClick={onCommit}
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {committing ? "Importing…" : `Import into ${formatMonthLabel(date)}`}
                </button>
            </div>
        </section>
    );
}
