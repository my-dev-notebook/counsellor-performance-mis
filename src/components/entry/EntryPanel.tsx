"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { FiAlertCircle, FiArrowRight } from "react-icons/fi";
import type { ProgressRow } from "@/db/types";
import { formatInt, formatText } from "@/lib/format";
import { saveEntryAction, getPrefillAction } from "@/app/(app)/entry/actions";

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div data-component="Detail">
            <div className="t-caps">{label}</div>
            <div className="t-sm mt-0.5">{value}</div>
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
            className="stack"
        >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Detail label="Email" value={formatText(counsellor.email)} />
                <Detail label="Meritto ID" value={counsellor.merittoUserId?.toString() ?? "—"} />
                <Detail label="Team" value={formatText(row.teamName)} />
                <Detail label="Agency" value={formatText(counsellor.agencyName)} />
            </div>

            {loadingPrefill && (
                <p className="hint inline-flex items-center gap-2">
                    <span className="spinner" aria-hidden />
                    Loading last month&apos;s figures…
                </p>
            )}

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="field">
                    <span className="label">Overall / Target</span>
                    <input
                        type="number"
                        min={0}
                        autoFocus
                        value={overall}
                        onChange={(e) => {
                            setOverall(e.target.value);
                        }}
                        className="input input-num"
                    />
                </label>
                <label className="field">
                    <span className="label">Non-negotiable</span>
                    <input
                        type="number"
                        min={0}
                        value={nonNegotiable}
                        onChange={(e) => {
                            setNonNegotiable(e.target.value);
                        }}
                        className="input input-num"
                    />
                </label>
                <div className="field">
                    <span className="label">Achieved</span>
                    {/* Read-only: derived from daily admissions (live) or the finalize job (closed months). */}
                    <span className="input input-num readonly inline-flex items-center justify-end">
                        {formatInt(entry?.achieved ?? null)}
                    </span>
                    <span className="hint">Derived from daily admissions</span>
                </div>
            </div>

            {error && (
                <p className="error-text">
                    <FiAlertCircle aria-hidden />
                    {error}
                </p>
            )}

            <div className="row border-t border-line-1 pt-4">
                <button type="submit" disabled={pending} className="btn btn-primary">
                    {pending && <span className="spinner" aria-hidden />}
                    {pending ? "Saving…" : "Save"}
                </button>
                <Link
                    href={`/entry/daily?userId=${String(counsellor.id)}&date=${date}`}
                    className="btn btn-link ml-auto"
                >
                    Manage daily admissions
                    <FiArrowRight aria-hidden />
                </Link>
            </div>
        </form>
    );
}
