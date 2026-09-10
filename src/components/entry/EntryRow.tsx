"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { ProgressRow } from "@/db/types";
import { formatInt, formatText } from "@/lib/format";
import { saveEntryAction, getPrefillAction } from "@/app/entry/actions";

export function EntryRow({ row, date }: { row: ProgressRow; date: string }) {
    const { counsellor, entry } = row;
    const [open, setOpen] = useState(false);
    const [loadingPrefill, setLoadingPrefill] = useState(false);
    const [overall, setOverall] = useState<string>(entry?.overall?.toString() ?? "");
    const [nonNegotiable, setNonNegotiable] = useState<string>(entry?.nonNegotiable?.toString() ?? "");
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const toggleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next && entry === null) {
            setLoadingPrefill(true);
            void getPrefillAction(counsellor.id, date)
                .then((prefill) => {
                    if (prefill) {
                        setOverall((cur) => (cur === "" ? (prefill.overall?.toString() ?? "") : cur));
                        setNonNegotiable((cur) => (cur === "" ? (prefill.nonNegotiable?.toString() ?? "") : cur));
                    }
                })
                .finally(() => {
                    setLoadingPrefill(false);
                });
        }
    };

    const parseNumberField = (value: string): number | null => {
        if (value.trim() === "") return null;
        const n = Number.parseInt(value, 10);
        return Number.isFinite(n) ? n : null;
    };

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

    const status = entry === null ? "Pending" : "Filled";

    return (
        <>
            <tr
                data-component="EntryRow"
                onClick={toggleOpen}
                aria-expanded={open}
                className={`cursor-pointer hover:bg-accent/50 ${open ? "bg-accent/50" : ""} ${counsellor.isActive ? "" : "opacity-50"}`}
            >
                <td className="px-3 py-2 font-medium text-foreground">{counsellor.name}</td>
                <td className="px-3 py-2 text-muted-foreground">{counsellor.teamName}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatText(counsellor.agencyName)}</td>
                <td className="px-3 py-2">
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            status === "Filled"
                                ? "bg-success/15 text-success ring-1 ring-success/30"
                                : "bg-muted text-muted-foreground ring-1 ring-border"
                        }`}
                    >
                        {status}
                    </span>
                </td>
            </tr>
            {open && (
                <tr data-component="EntryRow" className="bg-accent/50">
                    <td colSpan={4} className="px-4 py-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="text-sm text-muted-foreground">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Email
                                </p>
                                <p>{formatText(counsellor.email)}</p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Meritto ID
                                </p>
                                <p>{counsellor.merittoUserId}</p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Team
                                </p>
                                <p>{counsellor.teamName}</p>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Agency
                                </p>
                                <p>{formatText(counsellor.agencyName)}</p>
                            </div>
                        </div>

                        {loadingPrefill && (
                            <p className="mt-3 text-xs text-muted-foreground">Loading last month&apos;s figures…</p>
                        )}

                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                                Overall / Target
                                <input
                                    type="number"
                                    min={0}
                                    value={overall}
                                    onChange={(e) => {
                                        setOverall(e.target.value);
                                    }}
                                    className="mt-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                />
                            </label>
                            <label className="flex flex-col text-xs font-medium text-muted-foreground">
                                Non-Negotiable
                                <input
                                    type="number"
                                    min={0}
                                    value={nonNegotiable}
                                    onChange={(e) => {
                                        setNonNegotiable(e.target.value);
                                    }}
                                    className="mt-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                />
                            </label>
                            <div className="flex flex-col text-xs font-medium text-muted-foreground">
                                Achieved
                                {/* Read-only: derived from daily admissions (live) or the finalize job (closed months). */}
                                <span className="mt-1 rounded-md border border-transparent px-2 py-1 text-sm text-foreground">
                                    {formatInt(entry?.achieved ?? null)}
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center gap-3">
                            <button
                                type="button"
                                disabled={pending}
                                onClick={save}
                                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                            >
                                {pending ? "Saving…" : "Save"}
                            </button>
                            {error && <p className="text-xs text-destructive">{error}</p>}
                            <Link
                                href={`/entry/daily?userId=${String(counsellor.id)}&date=${date}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                className="ml-auto text-xs font-medium text-primary hover:underline"
                            >
                                Manage daily admissions →
                            </Link>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
