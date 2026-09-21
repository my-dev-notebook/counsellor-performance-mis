"use client";

import type { AdmissionRecord } from "@/db/types";
import type { AdmissionChange, AdmissionConflict, DayDiff } from "@/lib/admissions/diff";
import type { AdmissionFetchDiff } from "@/app/(app)/entry/actions";
import { FiAlertCircle, FiAlertTriangle } from "react-icons/fi";
import { MONTH_NAMES } from "@/lib/format";

type RowStatus = "added" | "changed" | "removed";

const STATUS_STYLE: Record<RowStatus, { label: string; tag: string; row: string }> = {
    added: { label: "Added", tag: "tag-good", row: "" },
    changed: { label: "Changed", tag: "tag-warn", row: "" },
    removed: { label: "Removed", tag: "tag-bad", row: "line-through" },
};

const FIELDS: { key: keyof AdmissionRecord; header: string }[] = [
    { key: "applicationNumber", header: "Application no" },
    { key: "applicantUserId", header: "Applicant ID" },
    { key: "applicantName", header: "Applicant name" },
    { key: "formId", header: "Form ID" },
    { key: "formName", header: "Form name" },
];

/** "2026-08-20" → "20 Aug" */
export function formatDay(date: string): string {
    const [, monthStr, dayStr] = date.split("-");
    const month = Number.parseInt(monthStr ?? "", 10);
    return `${String(Number.parseInt(dayStr ?? "", 10))} ${MONTH_NAMES[month - 1]?.slice(0, 3) ?? ""}`;
}

function StatusBadge({ status }: { status: RowStatus }) {
    const style = STATUS_STYLE[status];
    return (
        <span data-component="StatusBadge" className={`tag ${style.tag}`}>
            {style.label}
        </span>
    );
}

/** Per-application remark shown under the status badge (e.g. which counsellor a row moved from). */
export type RowNotes = ReadonlyMap<string, string>;

function DiffRow({ status, record, note }: { status: "added" | "removed"; record: AdmissionRecord; note?: string }) {
    return (
        <tr data-component="DiffRow" className={STATUS_STYLE[status].row}>
            <td>
                <StatusBadge status={status} />
                {note && <span className="t-xs ink-3 mt-0.5 block whitespace-nowrap no-underline">{note}</span>}
            </td>
            {FIELDS.map((f) => (
                <td key={f.key}>{String(record[f.key])}</td>
            ))}
        </tr>
    );
}

/** A changed row: unchanged fields plain, differing fields as "old → new". */
function ChangedRow({ change }: { change: AdmissionChange }) {
    return (
        <tr data-component="ChangedRow" className={STATUS_STYLE.changed.row}>
            <td>
                <StatusBadge status="changed" />
            </td>
            {FIELDS.map((f) => {
                const before = String(change.before[f.key]);
                const after = String(change.after[f.key]);
                return (
                    <td key={f.key}>
                        {before === after ? (
                            after
                        ) : (
                            <span className="flex flex-col">
                                <span className="text-bad-soft-fg line-through">{before}</span>
                                <span className="text-good-soft-fg">{after}</span>
                            </span>
                        )}
                    </td>
                );
            })}
        </tr>
    );
}

export function DayDiffSection({ diff, notes }: { diff: DayDiff; notes?: RowNotes }) {
    const parts = [
        diff.added.length > 0 ? `+${String(diff.added.length)} added` : null,
        diff.changed.length > 0 ? `${String(diff.changed.length)} changed` : null,
        diff.removed.length > 0 ? `−${String(diff.removed.length)} removed` : null,
        `${String(diff.unchanged)} unchanged`,
    ].filter((p) => p !== null);
    return (
        <div data-component="DayDiffSection" className="stack gap-1.5">
            <p className="t-sm font-semibold">
                {formatDay(diff.date)}
                <span className="ink-3 ml-2 font-normal">
                    {parts.join(" · ")} → {diff.fetched.length} after apply
                </span>
            </p>
            <div className="table-wrap">
                <div className="scroll">
                    <table className="table text-xs">
                        <thead>
                            <tr>
                                <th>Change</th>
                                {FIELDS.map((f) => (
                                    <th key={f.key}>{f.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {diff.added.map((r) => (
                                <DiffRow
                                    key={r.applicationNumber}
                                    status="added"
                                    record={r}
                                    note={notes?.get(r.applicationNumber)}
                                />
                            ))}
                            {diff.changed.map((c) => (
                                <ChangedRow key={c.after.applicationNumber} change={c} />
                            ))}
                            {diff.removed.map((r) => (
                                <DiffRow
                                    key={r.applicationNumber}
                                    status="removed"
                                    record={r}
                                    note={notes?.get(r.applicationNumber)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export function ConflictList({ conflicts }: { conflicts: AdmissionConflict[] }) {
    return (
        <div data-component="ConflictList" className="alert alert-warn">
            <FiAlertTriangle aria-hidden />
            <div>
                <div className="title">
                    {conflicts.length} fetched row{conflicts.length === 1 ? "" : "s"} skipped — already recorded
                    elsewhere
                </div>
                <ul className="t-xs mt-1 flex flex-col gap-0.5">
                    {conflicts.map((c) => (
                        <li key={c.record.applicationNumber}>
                            <b>{c.record.applicationNumber}</b> ({c.record.applicantName}) on {formatDay(c.date)} —
                            credited to {c.ownerName} on {c.ownerDate}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

/**
 * What an auto-fetch would change, day by day, with the apply/discard
 * decision. Shared by the per-day and whole-month fetch on the daily-entry
 * page; the caller owns the fetch and the apply, this only renders the diff.
 */
export function AdmissionDiffPanel({
    title,
    diff,
    applying,
    error,
    onApply,
    onDiscard,
}: {
    title: string;
    diff: AdmissionFetchDiff;
    applying: boolean;
    error: string | null;
    onApply: () => void;
    onDiscard: () => void;
}) {
    const dayCount = diff.days.length;
    const totals = diff.days.reduce(
        (acc, d) => ({
            added: acc.added + d.added.length,
            changed: acc.changed + d.changed.length,
            removed: acc.removed + d.removed.length,
        }),
        { added: 0, changed: 0, removed: 0 },
    );

    return (
        <div data-component="AdmissionDiffPanel" className="card card-pad stack gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="card-title">{title}</p>
                    <p className="card-meta">
                        Meritto returned {diff.fetchedCount} row{diff.fetchedCount === 1 ? "" : "s"}.{" "}
                        {dayCount === 0
                            ? "Nothing differs from what is saved."
                            : `${String(dayCount)} day${dayCount === 1 ? "" : "s"} differ: +${String(totals.added)} added, ${String(totals.changed)} changed, −${String(totals.removed)} removed.`}
                    </p>
                </div>
                <div className="row gap-2">
                    {dayCount > 0 && (
                        <button type="button" disabled={applying} onClick={onApply} className="btn btn-primary btn-sm">
                            {applying && <span className="spinner" aria-hidden />}
                            {applying ? "Applying…" : `Apply ${String(dayCount)} day${dayCount === 1 ? "" : "s"} to DB`}
                        </button>
                    )}
                    <button type="button" disabled={applying} onClick={onDiscard} className="btn btn-secondary btn-sm">
                        {dayCount === 0 ? "Close" : "Discard"}
                    </button>
                </div>
            </div>
            {dayCount > 0 && (
                <p className="hint">
                    Applying replaces each listed day in the DB with Meritto&apos;s rows: removed rows are deleted, and
                    unsaved edits in the grid are dropped.
                </p>
            )}
            {diff.conflicts.length > 0 && <ConflictList conflicts={diff.conflicts} />}
            {diff.days.map((d) => (
                <DayDiffSection key={d.date} diff={d} />
            ))}
            {error && (
                <p className="error-text">
                    <FiAlertCircle aria-hidden />
                    {error}
                </p>
            )}
        </div>
    );
}
