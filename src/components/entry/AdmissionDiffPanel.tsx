"use client";

import type { AdmissionRecord } from "@/db/types";
import type { AdmissionChange, AdmissionConflict, DayDiff } from "@/lib/admissions/diff";
import type { AdmissionFetchDiff } from "@/app/(app)/entry/actions";
import { MONTH_NAMES } from "@/lib/format";

const BUTTON =
    "rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";

type RowStatus = "added" | "changed" | "removed";

const STATUS_STYLE: Record<RowStatus, { label: string; badge: string; row: string }> = {
    added: { label: "Added", badge: "bg-success/15 text-success", row: "bg-success/5" },
    changed: { label: "Changed", badge: "bg-warning/15 text-warning", row: "bg-warning/5" },
    removed: { label: "Removed", badge: "bg-destructive/15 text-destructive", row: "bg-destructive/5 line-through" },
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
        <span
            data-component="StatusBadge"
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${style.badge}`}
        >
            {style.label}
        </span>
    );
}

/** Per-application remark shown under the status badge (e.g. which counsellor a row moved from). */
export type RowNotes = ReadonlyMap<string, string>;

function DiffRow({ status, record, note }: { status: "added" | "removed"; record: AdmissionRecord; note?: string }) {
    return (
        <tr data-component="DiffRow" className={STATUS_STYLE[status].row}>
            <td className="px-2 py-1">
                <StatusBadge status={status} />
                {note && <span className="mt-0.5 block text-[10px] whitespace-nowrap text-muted-foreground no-underline">{note}</span>}
            </td>
            {FIELDS.map((f) => (
                <td key={f.key} className="px-2 py-1 text-foreground">
                    {String(record[f.key])}
                </td>
            ))}
        </tr>
    );
}

/** A changed row: unchanged fields plain, differing fields as "old → new". */
function ChangedRow({ change }: { change: AdmissionChange }) {
    return (
        <tr data-component="ChangedRow" className={STATUS_STYLE.changed.row}>
            <td className="px-2 py-1">
                <StatusBadge status="changed" />
            </td>
            {FIELDS.map((f) => {
                const before = String(change.before[f.key]);
                const after = String(change.after[f.key]);
                return (
                    <td key={f.key} className="px-2 py-1 text-foreground">
                        {before === after ? (
                            after
                        ) : (
                            <span className="flex flex-col">
                                <span className="text-destructive line-through">{before}</span>
                                <span className="text-success">{after}</span>
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
        <div data-component="DayDiffSection" className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">
                {formatDay(diff.date)}
                <span className="ml-2 font-normal text-muted-foreground">
                    {parts.join(" · ")} → {diff.fetched.length} after apply
                </span>
            </p>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-xs">
                    <thead>
                        <tr>
                            <th className="px-2 py-1 text-left font-semibold tracking-wide text-muted-foreground uppercase">
                                Change
                            </th>
                            {FIELDS.map((f) => (
                                <th
                                    key={f.key}
                                    className="px-2 py-1 text-left font-semibold tracking-wide text-muted-foreground uppercase"
                                >
                                    {f.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {diff.added.map((r) => (
                            <DiffRow key={r.applicationNumber} status="added" record={r} note={notes?.get(r.applicationNumber)} />
                        ))}
                        {diff.changed.map((c) => (
                            <ChangedRow key={c.after.applicationNumber} change={c} />
                        ))}
                        {diff.removed.map((r) => (
                            <DiffRow key={r.applicationNumber} status="removed" record={r} note={notes?.get(r.applicationNumber)} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function ConflictList({ conflicts }: { conflicts: AdmissionConflict[] }) {
    return (
        <div data-component="ConflictList" className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
            <p className="text-xs font-semibold text-warning">
                {conflicts.length} fetched row{conflicts.length === 1 ? "" : "s"} skipped — already recorded elsewhere
            </p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {conflicts.map((c) => (
                    <li key={c.record.applicationNumber}>
                        <span className="text-foreground">{c.record.applicationNumber}</span> ({c.record.applicantName}) on{" "}
                        {formatDay(c.date)} — credited to {c.ownerName} on {c.ownerDate}
                    </li>
                ))}
            </ul>
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
        <div data-component="AdmissionDiffPanel" className="space-y-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">
                        Meritto returned {diff.fetchedCount} row{diff.fetchedCount === 1 ? "" : "s"}.{" "}
                        {dayCount === 0
                            ? "Nothing differs from what is saved."
                            : `${String(dayCount)} day${dayCount === 1 ? "" : "s"} differ: +${String(totals.added)} added, ${String(totals.changed)} changed, −${String(totals.removed)} removed.`}
                    </p>
                </div>
                <div className="flex items-center gap-1">
                    {dayCount > 0 && (
                        <button
                            type="button"
                            disabled={applying}
                            onClick={onApply}
                            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                            {applying ? "Applying…" : `Apply ${String(dayCount)} day${dayCount === 1 ? "" : "s"} to DB`}
                        </button>
                    )}
                    <button type="button" disabled={applying} onClick={onDiscard} className={BUTTON}>
                        {dayCount === 0 ? "Close" : "Discard"}
                    </button>
                </div>
            </div>
            {dayCount > 0 && (
                <p className="text-xs text-muted-foreground">
                    Applying replaces each listed day in the DB with Meritto&apos;s rows: removed rows are deleted, and
                    unsaved edits in the grid are dropped.
                </p>
            )}
            {diff.conflicts.length > 0 && <ConflictList conflicts={diff.conflicts} />}
            {diff.days.map((d) => (
                <DayDiffSection key={d.date} diff={d} />
            ))}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}
