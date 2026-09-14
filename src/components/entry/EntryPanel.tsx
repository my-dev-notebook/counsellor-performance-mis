"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { ProgressRow } from "@/db/types";
import { formatInt, formatText } from "@/lib/format";
import { saveEntryAction, getPrefillAction } from "@/app/(app)/entry/actions";

const fieldLabel = "flex flex-col gap-1 text-xs font-medium text-muted-foreground";
const panelInput = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div data-component="Detail" className="text-sm text-muted-foreground">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
            <p>{value}</p>
        </div>
    );
}

function parseNumberField(value: string): number | null {
    if (value.trim() === "") return null;
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
}

/** The monthly-entry form shown under a clicked counsellor row. Mounted fresh each time a row opens. */
export function EntryPanel({ row, date }: { row: ProgressRow; date: string }) {
    const { counsellor, entry } = row;
    const [overall, setOverall] = useState<string>(entry?.overall?.toString() ?? "");
    const [nonNegotiable, setNonNegotiable] = useState<string>(entry?.nonNegotiable?.toString() ?? "");
    // Pending rows are seeded from the previous month's figures.
    const [loadingPrefill, setLoadingPrefill] = useState(entry === null);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (entry !== null) return;
        let cancelled = false;
        void getPrefillAction(counsellor.id, date)
            .then((prefill) => {
                if (cancelled || !prefill) return;
                setOverall((cur) => (cur === "" ? (prefill.overall?.toString() ?? "") : cur));
                setNonNegotiable((cur) => (cur === "" ? (prefill.nonNegotiable?.toString() ?? "") : cur));
            })
            .finally(() => {
                if (!cancelled) setLoadingPrefill(false);
            });
        return () => {
            cancelled = true;
        };
    }, [counsellor.id, date, entry]);

    const save = () => {
        setError(null);
        startTransition(async () => {
            try {
                await saveEntryAction({
                    userId: counsellor.id,
                    date,
                    overall: parseNumberField(overall),
                    nonNegotiable: parseNumberField(nonNegotiable),
                });
            } catch {
                setError("Failed to save. Check the values and try again.");
            }
        });
    };

    return (
        <form
            data-component="EntryPanel"
            onSubmit={(e) => {
                e.preventDefault();
                save();
            }}
            className="space-y-5"
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Email" value={formatText(counsellor.email)} />
                <Detail label="Meritto ID" value={counsellor.merittoUserId?.toString() ?? "—"} />
                <Detail label="Team" value={formatText(row.teamName)} />
                <Detail label="Agency" value={formatText(counsellor.agencyName)} />
            </div>

            {loadingPrefill && <p className="text-xs text-muted-foreground">Loading last month&apos;s figures…</p>}

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className={fieldLabel}>
                    Overall / Target
                    <input
                        type="number"
                        min={0}
                        autoFocus
                        value={overall}
                        onChange={(e) => {
                            setOverall(e.target.value);
                        }}
                        className={panelInput}
                    />
                </label>
                <label className={fieldLabel}>
                    Non-Negotiable
                    <input
                        type="number"
                        min={0}
                        value={nonNegotiable}
                        onChange={(e) => {
                            setNonNegotiable(e.target.value);
                        }}
                        className={panelInput}
                    />
                </label>
                <div className={fieldLabel}>
                    Achieved
                    {/* Read-only: derived from daily admissions (live) or the finalize job (closed months). */}
                    <span className="rounded-md border border-transparent px-3 py-2 text-sm text-foreground">
                        {formatInt(entry?.achieved ?? null)}
                    </span>
                </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                    {pending ? "Saving…" : "Save"}
                </button>
                <Link
                    href={`/entry/daily?userId=${String(counsellor.id)}&date=${date}`}
                    className="ml-auto text-xs font-medium text-primary hover:underline"
                >
                    Manage daily admissions →
                </Link>
            </div>
        </form>
    );
}
