"use client";

import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiDownload } from "react-icons/fi";
import { DateRangePicker } from "@/components/DateRangePicker";
import { getQualityExportAction, type QualityExportRow } from "@/app/(app)/quality/actions";
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
 * Quality report download: every active counsellor with their average AQS over
 * the audits in the chosen date range, highest first, rows tinted by the
 * AQS band. Built client-side (exceljs must not load on the Workers runtime).
 */
export function QualityExportButton() {
    const [from, setFrom] = useState(firstOfMonth);
    const [to, setTo] = useState(today);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Rows for the selected range, tagged with the range they were fetched for so a stale
    // response (or one still in flight) is never shown against the current dates.
    const [preview, setPreview] = useState<{ key: string; rows: QualityExportRow[] | null; error: string | null } | null>(
        null,
    );
    const rangeKey = `${from}|${to}`;
    const rangeValid = from !== "" && to !== "" && from <= to;

    useEffect(() => {
        if (!rangeValid) return;
        let cancelled = false;
        getQualityExportAction(from, to).then(
            (rows) => {
                if (!cancelled) setPreview({ key: rangeKey, rows, error: null });
            },
            (e: unknown) => {
                if (!cancelled)
                    setPreview({ key: rangeKey, rows: null, error: errorMessage(e, "Failed to check audits.") });
            },
        );
        return () => {
            cancelled = true;
        };
    }, [from, to, rangeKey, rangeValid]);

    const current = preview?.key === rangeKey ? preview : null;
    const checking = rangeValid && current === null;
    const missing = useMemo(() => (current?.rows ?? []).filter((r) => r.auditCount === 0), [current]);

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
            <div className="field">
                <span className="label">Date range</span>
                <DateRangePicker
                    value={{ from, to }}
                    onChange={(range) => {
                        setFrom(range.from);
                        setTo(range.to);
                    }}
                    size="sm"
                    aria-label="Report date range"
                />
            </div>
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
            <span className="hint">All active counsellors, average AQS over audits in the range, highest first.</span>
            {checking && (
                <p className="hint flex w-full items-center gap-2">
                    <span className="spinner" aria-hidden /> Checking audits in the selected range…
                </p>
            )}
            {current?.error && <p className="error-text w-full">{current.error}</p>}
            {current?.rows && <MissingAudits missing={current.rows.length > 0 ? missing : null} />}
            {error && <p className="error-text w-full">{error}</p>}
        </div>
    );
}

/**
 * Counsellors with no audit in the selected range, grouped by team, so the
 * auditor sees the gaps before downloading. `null` means there are no active
 * counsellors at all.
 */
function MissingAudits({ missing }: { missing: QualityExportRow[] | null }) {
    const byTeam = useMemo(() => {
        const groups = new Map<string, string[]>();
        for (const row of missing ?? []) {
            const team = row.teamName || "No team";
            groups.set(team, [...(groups.get(team) ?? []), row.name]);
        }
        return [...groups.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([team, names]) => ({ team, names: names.sort((a, b) => a.localeCompare(b)) }));
    }, [missing]);

    if (missing === null) return null;

    if (missing.length === 0) {
        return (
            <div data-component="MissingAudits" className="alert alert-good w-full">
                <FiCheckCircle aria-hidden />
                <div className="title">Every active counsellor has at least one audit in this range.</div>
            </div>
        );
    }

    return (
        <div data-component="MissingAudits" className="alert alert-warn w-full">
            <FiAlertTriangle aria-hidden />
            <div>
                <div className="title">
                    {missing.length} counsellor{missing.length === 1 ? " has" : "s have"} no audit in this range
                </div>
                <ul className="t-xs mt-1 flex flex-col gap-0.5">
                    {byTeam.map(({ team, names }) => (
                        <li key={team}>
                            <b>{team}:</b> {names.join(", ")}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
