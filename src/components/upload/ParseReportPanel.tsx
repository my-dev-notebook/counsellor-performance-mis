"use client";

import { useState } from "react";
import type { ParsedWorkbook, WarningLevel } from "@/lib/parser/schemas";

const LEVEL_STYLES: Record<WarningLevel, string> = {
    info: "bg-info/15 text-info ring-info/30",
    warn: "bg-warning/15 text-warning ring-warning/30",
    error: "bg-destructive/15 text-destructive ring-destructive/30",
};

export function ParseReportPanel({ workbook }: { workbook: ParsedWorkbook }) {
    const [open, setOpen] = useState(false);
    const ignored = workbook.warnings.filter((w) => w.code === "SHEET_IGNORED");
    const otherWarnings = workbook.warnings.filter((w) => w.code !== "SHEET_IGNORED");

    return (
        <section data-component="ParseReportPanel" className="rounded-lg border border-border bg-card">
            <button
                type="button"
                onClick={() => {
                    setOpen((v) => !v);
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
                <span className="text-sm font-medium text-foreground">
                    Parse Report — {workbook.teams.length} sheet{workbook.teams.length === 1 ? "" : "s"} read,{" "}
                    {ignored.length} ignored, {workbook.warnings.length} warning
                    {workbook.warnings.length === 1 ? "" : "s"}
                </span>
                <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
            </button>
            {open && (
                <div className="space-y-4 border-t border-border px-4 py-4">
                    <div>
                        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Sheets read
                        </h3>
                        <ul className="mt-2 space-y-1 text-sm text-foreground">
                            {workbook.teams.map((team) => (
                                <li key={team.team}>
                                    {team.team} — {team.headcount} row{team.headcount === 1 ? "" : "s"}
                                    {team.reconciles === false && (
                                        <span className="ml-2 text-warning">(total mismatch)</span>
                                    )}
                                    {team.reconciles === null && (
                                        <span className="ml-2 text-muted-foreground">(no total row to check)</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                    {ignored.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Sheets ignored
                            </h3>
                            <ul className="mt-2 space-y-1 text-sm text-foreground">
                                {ignored.map((w, i) => (
                                    <li key={i}>
                                        <span className="font-medium">{w.sheet}</span> — {w.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {otherWarnings.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Warnings
                            </h3>
                            <ul className="mt-2 space-y-1.5 text-sm">
                                {otherWarnings.map((w, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span
                                            className={`mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${LEVEL_STYLES[w.level]}`}
                                        >
                                            {w.level}
                                        </span>
                                        <span className="text-foreground">
                                            {w.sheet && <span className="font-medium">{w.sheet}</span>}
                                            {w.row !== undefined && (
                                                <span className="text-muted-foreground"> row {w.row}</span>
                                            )}{" "}
                                            — {w.message}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
