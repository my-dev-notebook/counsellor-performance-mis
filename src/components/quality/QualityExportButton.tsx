"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import { DatePicker } from "@/components/DatePicker";
import { getQualityExportAction } from "@/app/(app)/quality/actions";
import { aqsStatus } from "@/schemas/call-audit";
import type { Status } from "@/schemas/parser";

/** Soft row fills (ARGB), readable with black text in Excel. */
const ROW_FILL: Partial<Record<Status, string>> = {
    Green: "FFD9EAD3",
    Yellow: "FFFCE5CD",
    Red: "FFF4CCCC",
};
/** Text colour for a counsellor with no audit in the range: greyed out, no fill. */
const UNAUDITED_FONT_COLOR = "FF9E9E9E";

function firstOfMonth(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message !== "" ? error.message : fallback;
}

/**
 * Quality report download: every active counsellor with their lowest AQS over
 * the audits in the chosen date range, highest first, rows tinted by the
 * AQS band. Built client-side (exceljs must not load on the Workers runtime).
 */
export function QualityExportButton() {
    const [from, setFrom] = useState(firstOfMonth);
    const [to, setTo] = useState(today);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const download = async () => {
        setBusy(true);
        setError(null);
        try {
            const rows = await getQualityExportAction(from, to);
            const ExcelJS = (await import("exceljs")).default;
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Quality");
            sheet.columns = [
                { header: "Counsellor name", key: "name", width: 26 },
                { header: "Email", key: "email", width: 30 },
                { header: "Team name", key: "teamName", width: 20 },
                { header: "Quality score", key: "qualityScore", width: 14, style: { numFmt: "0.0%" } },
                { header: "Audits", key: "auditCount", width: 8 },
            ];
            sheet.getRow(1).font = { bold: true };

            // Highest score first; unaudited counsellors at the bottom, by name.
            const sorted = [...rows].sort((a, b) => {
                if (a.qualityScore === null && b.qualityScore === null) return a.name.localeCompare(b.name);
                if (a.qualityScore === null) return 1;
                if (b.qualityScore === null) return -1;
                return b.qualityScore - a.qualityScore || a.name.localeCompare(b.name);
            });

            for (const row of sorted) {
                const added = sheet.addRow({
                    name: row.name,
                    email: row.email,
                    teamName: row.teamName,
                    qualityScore: row.qualityScore ?? "-",
                    auditCount: row.auditCount,
                });
                if (row.qualityScore === null) {
                    added.font = { color: { argb: UNAUDITED_FONT_COLOR } };
                } else {
                    const fill = ROW_FILL[aqsStatus(row.qualityScore)];
                    if (fill) {
                        added.eachCell({ includeEmpty: true }, (cell) => {
                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
                        });
                    }
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Quality ${from} to ${to}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(errorMessage(e, "Failed to build the report."));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            data-component="QualityExportButton"
            className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
        >
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                From
                <DatePicker value={from} onChange={setFrom} max={to} size="sm" aria-label="Report start date" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                To
                <DatePicker value={to} onChange={setTo} min={from} size="sm" aria-label="Report end date" />
            </label>
            <button
                type="button"
                disabled={busy || from === "" || to === ""}
                onClick={() => {
                    void download();
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
                <FiDownload className="h-3.5 w-3.5" />
                {busy ? "Preparing…" : "Download Excel"}
            </button>
            <span className="text-xs text-muted-foreground">
                All active counsellors, lowest AQS among audits in the range, highest first.
            </span>
            {error && <p className="w-full text-xs text-destructive">{error}</p>}
        </div>
    );
}
