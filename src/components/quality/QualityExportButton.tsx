"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import { DatePicker } from "@/components/DatePicker";
import { getQualityExportAction } from "@/app/(app)/quality/actions";
import { aqsStatus } from "@/schemas/call-audit";
import type { Status } from "@/schemas/parser";

/** Soft row fills (ARGB), readable with black text in Excel. */
const ROW_FILL: Partial<Record<Status, string>> = {
    Green: "FFB7E1A1",
    Yellow: "FFFFD966",
    Red: "FFF4A6A6",
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
                { header: "Quality score", key: "qualityScore", width: 14, style: { numFmt: "0%" } },
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

            // Colour legend two columns right of the table, from row 3: swatch in G, range in H.
            const LEGEND: { status: Status; label: string }[] = [
                { status: "Green", label: "100%" },
                { status: "Yellow", label: ">= 88%" },
                { status: "Red", label: "< 88%" },
            ];
            sheet.getColumn(7).width = 4;
            sheet.getColumn(8).width = 10;
            LEGEND.forEach(({ status, label }, i) => {
                const swatch = sheet.getCell(i + 3, 7);
                const fill = ROW_FILL[status];
                if (fill) swatch.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
                const text = sheet.getCell(i + 3, 8);
                text.value = label;
                // Row-level grey font (unaudited rows) would otherwise bleed into the legend.
                text.font = { color: { argb: "FF000000" } };
            });

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
        <div data-component="QualityExportButton" className="card card-pad flex flex-wrap items-end gap-x-4 gap-y-3">
            <label className="field w-40">
                <span className="label">From</span>
                <DatePicker value={from} onChange={setFrom} max={to} size="sm" aria-label="Report start date" />
            </label>
            <label className="field w-40">
                <span className="label">To</span>
                <DatePicker value={to} onChange={setTo} min={from} size="sm" aria-label="Report end date" />
            </label>
            <button
                type="button"
                disabled={busy || from === "" || to === ""}
                onClick={() => {
                    void download();
                }}
                className="btn btn-secondary btn-sm"
            >
                {busy ? <span className="spinner" aria-hidden /> : <FiDownload aria-hidden />}
                {busy ? "Preparing…" : "Download Excel"}
            </button>
            <span className="hint">All active counsellors, lowest AQS among audits in the range, highest first.</span>
            {error && <p className="error-text w-full">{error}</p>}
        </div>
    );
}
