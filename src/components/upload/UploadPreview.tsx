"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardState } from "@/lib/dashboard-state";
import { PageHeader } from "@/components/shell/PageHeader";
import { UploadZone } from "@/components/upload/UploadZone";
import { ParseReportPanel } from "@/components/upload/ParseReportPanel";
import { ImportReview } from "@/components/upload/import/ImportReview";
import { ErrorState } from "@/components/ErrorState";
import { CompanyDashboard } from "@/components/dashboard/CompanyDashboard";

type Mode = "preview" | "import";

interface LoadedFile {
    buffer: ArrayBuffer;
    name: string;
}

export function UploadPreview({ teamNames, canImport }: { teamNames: string[]; canImport: boolean }) {
    const [state, setState] = useState<DashboardState>({ status: "idle" });
    const [file, setFile] = useState<LoadedFile | null>(null);
    const [mode, setMode] = useState<Mode>("preview");
    // Sheet name → team name, for roster-like sheets the matcher could not
    // place that the operator mapped by hand on the import screen. Changing
    // it re-parses the same buffer.
    const [sheetOverrides, setSheetOverrides] = useState<Record<string, string | null>>({});

    const parse = useCallback(
        async (loaded: LoadedFile, overrides: Record<string, string | null>, options?: { quiet?: boolean }) => {
            // A re-parse (sheet mapping changed) keeps the current workbook on
            // screen so the import review, and the decisions taken on it, survive.
            if (!options?.quiet) setState({ status: "parsing", fileName: loaded.name });
            // Dynamic import: `exceljs` must never be evaluated during SSR on the
            // Workers runtime (it calls `process.umask()` at module-load time,
            // which `unenv`'s Node compat shim doesn't implement) — only load it
            // client-side, on demand.
            const { parseWorkbook } = await import("@/lib/parser/parse-workbook");
            const result = await parseWorkbook(loaded.buffer, loaded.name, {
                teams: teamNames,
                sheetTeamOverrides: overrides,
            });
            result.match(
                (workbook) => {
                    setState({ status: "ready", workbook });
                },
                (error) => {
                    setState({ status: "failed", error, fileName: loaded.name });
                },
            );
        },
        [teamNames],
    );

    const handleFile = useCallback(
        (selected: File) => {
            setMode("preview");
            setSheetOverrides({});
            setState({ status: "parsing", fileName: selected.name });
            void selected.arrayBuffer().then((buffer) => {
                const loaded = { buffer, name: selected.name };
                setFile(loaded);
                void parse(loaded, {});
            });
        },
        [parse],
    );

    // Re-parse when a sheet mapping changes (the initial parse is done in handleFile).
    useEffect(() => {
        if (file && Object.keys(sheetOverrides).length > 0) void parse(file, sheetOverrides, { quiet: true });
    }, [file, sheetOverrides, parse]);

    const ready = state.status === "ready";

    return (
        <div data-component="UploadPreview" className="stack gap-5">
            <PageHeader
                title="Upload & import"
                sub={
                    ready
                        ? `${state.workbook.monthLabel} · ${String(state.workbook.counsellors.length)} counsellors · ${String(state.workbook.teams.length)} teams · parsed in-browser from ${state.workbook.sourceFileName}`
                        : "Drop a raw monthly workbook to preview how it parses. Nothing is saved until you switch to Import, review every row and confirm."
                }
                actions={ready && canImport ? <ModeSwitch mode={mode} onChange={setMode} /> : undefined}
            />
            <UploadZone onFileSelected={handleFile} busy={state.status === "parsing"} />
            {state.status === "failed" && <ErrorState error={state.error} fileName={state.fileName} />}
            {ready && (
                <>
                    <ParseReportPanel workbook={state.workbook} />
                    {mode === "import" && canImport ? (
                        <ImportReview
                            workbook={state.workbook}
                            teamNames={teamNames}
                            sheetOverrides={sheetOverrides}
                            onMapSheet={(sheet, team) => {
                                setSheetOverrides((previous) => ({ ...previous, [sheet]: team }));
                            }}
                        />
                    ) : (
                        <CompanyDashboard workbook={state.workbook} />
                    )}
                </>
            )}
        </div>
    );
}

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
    const button = (value: Mode, label: string) => (
        <button
            type="button"
            onClick={() => {
                onChange(value);
            }}
            aria-selected={mode === value}
        >
            {label}
        </button>
    );
    return (
        <div data-component="ModeSwitch" className="segmented" role="tablist" aria-label="Mode">
            {button("preview", "Preview")}
            {button("import", "Import into database")}
        </div>
    );
}
