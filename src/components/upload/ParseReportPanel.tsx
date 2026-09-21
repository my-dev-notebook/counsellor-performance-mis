"use client";

import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import type { ParsedWorkbook, WarningLevel } from "@/schemas/parser";

const LEVEL_STYLES: Record<WarningLevel, string> = {
    info: "tag-info",
    warn: "tag-warn",
    error: "tag-bad",
};

export function ParseReportPanel({ workbook }: { workbook: ParsedWorkbook }) {
    const [open, setOpen] = useState(false);
    const ignored = workbook.warnings.filter((w) => w.code === "SHEET_IGNORED");
    const otherWarnings = workbook.warnings.filter((w) => w.code !== "SHEET_IGNORED");

    return (
        <details
            data-component="ParseReportPanel"
            className="collapsible card"
            open={open}
            onToggle={(e) => {
                setOpen(e.currentTarget.open);
            }}
        >
            <summary>
                <span>
                    Parse report — {workbook.teams.length} sheet{workbook.teams.length === 1 ? "" : "s"} read,{" "}
                    {ignored.length} ignored, {workbook.warnings.length} warning
                    {workbook.warnings.length === 1 ? "" : "s"}
                </span>
                <FiChevronDown aria-hidden />
            </summary>
            <div className="body stack gap-4">
                <div>
                    <h3 className="t-caps">Sheets read</h3>
                    <ul className="t-sm mt-2 flex flex-col gap-1">
                        {workbook.teams.map((team) => (
                            <li key={team.team}>
                                {team.team} — {team.headcount} row{team.headcount === 1 ? "" : "s"}
                                {team.reconciles === false && (
                                    <span className="ml-2 text-warn-soft-fg">(total mismatch)</span>
                                )}
                                {team.reconciles === null && (
                                    <span className="ink-3 ml-2">(no total row to check)</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                {ignored.length > 0 && (
                    <div>
                        <h3 className="t-caps">Sheets ignored</h3>
                        <ul className="t-sm mt-2 flex flex-col gap-1">
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
                        <h3 className="t-caps">Warnings</h3>
                        <ul className="t-sm mt-2 flex flex-col gap-1.5">
                            {otherWarnings.map((w, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className={`tag mt-0.5 shrink-0 ${LEVEL_STYLES[w.level]}`}>{w.level}</span>
                                    <span>
                                        {w.sheet && <span className="font-medium">{w.sheet}</span>}
                                        {w.row !== undefined && <span className="ink-3"> row {w.row}</span>} —{" "}
                                        {w.message}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </details>
    );
}
