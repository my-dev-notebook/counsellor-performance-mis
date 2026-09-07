"use client";

import { useState } from "react";
import { FiDownload } from "react-icons/fi";
import { getExportDataAction } from "@/app/entry/actions";
import { derivePending, derivePctAchieved } from "@/lib/metrics/derive";

// Excel worksheet names cannot contain: * ? : \ / [ ]
const INVALID_SHEET_NAME_CHARS = /[*?:\\/[\]]/g;

function sanitizeSheetName(name: string): string {
    return name.replace(INVALID_SHEET_NAME_CHARS, " ").trim().slice(0, 31);
}

const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export function ExportButton({ year, month }: { year: number; month: number }) {
    const [busy, setBusy] = useState(false);

    const download = async () => {
        setBusy(true);
        try {
            const rows = await getExportDataAction(year, month);

            // Dynamic import: exceljs must never be evaluated during SSR on the
            // Workers runtime (see src/app/page.tsx) — only load it client-side.
            const ExcelJS = (await import("exceljs")).default;
            const workbook = new ExcelJS.Workbook();

            const byTeam = new Map<string, typeof rows>();
            for (const row of rows) {
                const list = byTeam.get(row.counsellor.teamName) ?? [];
                list.push(row);
                byTeam.set(row.counsellor.teamName, list);
            }

            for (const [teamName, teamRows] of [...byTeam.entries()].sort(([a], [b]) => a.localeCompare(b))) {
                const sheet = workbook.addWorksheet(sanitizeSheetName(teamName));
                sheet.columns = [
                    { header: "S.No", key: "sNo", width: 6 },
                    { header: "Counsellor Name", key: "name", width: 24 },
                    { header: "Agency Name", key: "agency", width: 20 },
                    { header: "DOJ", key: "doj", width: 14, style: { numFmt: "dd-mmm-yyyy" } },
                    { header: "Email ID", key: "email", width: 24 },
                    { header: "Target", key: "target", width: 10 },
                    { header: "Non-Negotiable", key: "nonNegotiable", width: 14 },
                    { header: "Achieved", key: "achieved", width: 10 },
                    { header: "Acknowledgment", key: "acknowledgment", width: 14 },
                    { header: "Pending", key: "pending", width: 10 },
                    { header: "% Achieved", key: "pctAchieved", width: 12, style: { numFmt: "0.0%" } },
                    { header: "Feedback", key: "feedback", width: 30 },
                ];
                sheet.getRow(1).font = { bold: true };

                teamRows
                    .sort((a, b) => a.counsellor.name.localeCompare(b.counsellor.name))
                    .forEach((row, index) => {
                        const target = row.entry?.overall ?? null;
                        const achieved = row.entry?.achieved ?? null;
                        const excelRow = sheet.addRow({
                            sNo: index + 1,
                            name: row.counsellor.name,
                            agency: row.counsellor.agencyName ?? "",
                            doj: row.counsellor.doj ? new Date(row.counsellor.doj) : null,
                            email: row.counsellor.email ?? "",
                            target,
                            nonNegotiable: row.entry?.nonNegotiable ?? null,
                            achieved,
                            acknowledgment:
                                row.entry?.acknowledgment === true
                                    ? "Yes"
                                    : row.entry?.acknowledgment === false
                                      ? "No"
                                      : "",
                            pending: derivePending(target, achieved),
                            pctAchieved: derivePctAchieved(target, achieved),
                            feedback: row.entry?.feedback ?? "",
                        });

                        if (row.entry?.achievedFlagged) {
                            const cell = excelRow.getCell("achieved");
                            cell.note = "Flagged as questionable — value may be unreliable.";
                            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3CD" } };
                        }
                    });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const monthLabel = MONTH_NAMES[month - 1] ?? String(month);
            a.download = `${monthLabel} ${String(year)} Performance.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            data-component="ExportButton"
            type="button"
            disabled={busy}
            onClick={() => {
                void download();
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
            <FiDownload className="h-3.5 w-3.5" />
            {busy ? "Preparing…" : "Download Excel"}
        </button>
    );
}
