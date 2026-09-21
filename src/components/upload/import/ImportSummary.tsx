"use client";

import { useState } from "react";
import type { CommitOutcome } from "@/db/queries/imports";
import type { RowStatus } from "@/lib/import/decisions";
import { formatMonthLabel } from "@/lib/format";
import type { BulkActions } from "@/components/upload/import/ImportFilterBar";
import { FiAlertCircle } from "react-icons/fi";
import { Kpi } from "@/components/kpi/Kpi";

const BUTTON = "btn btn-secondary btn-sm";

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
        <section data-component="ImportSummary" className="stack gap-4">
            <div className="grid g6 gap-3">
                <Kpi small label="Rows" value={total} />
                <Kpi
                    small
                    label="Needs attention"
                    value={
                        <span className={attention > 0 ? "text-warn-soft-fg" : "text-good-soft-fg"}>{attention}</span>
                    }
                />
                <Kpi small label="New entries" value={counts.insert} />
                <Kpi small label="Updates" value={counts.update} />
                <Kpi small label="New users" value={counts.create} />
                <Kpi small label="No change / skipped" value={counts["no-change"] + counts.skip} />
            </div>

            <div className="card card-pad flex flex-wrap items-center gap-3">
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
                <label className="checkbox t-xs items-center">
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
                <div className="alert alert-bad">
                    <FiAlertCircle aria-hidden />
                    <p>
                        {error.kind === "stale"
                            ? `The month changed while you were reviewing (${String(error.rowIds.length)} row${error.rowIds.length === 1 ? "" : "s"}). The rows have been re-matched; please review and commit again.`
                            : error.message}
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="t-sm ink-2">
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
                    className="btn btn-primary"
                >
                    {committing && <span className="spinner" aria-hidden />}
                    {committing ? "Importing…" : `Import into ${formatMonthLabel(date)}`}
                </button>
            </div>
        </section>
    );
}
