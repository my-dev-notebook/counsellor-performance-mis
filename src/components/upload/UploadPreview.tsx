"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardState } from "@/lib/dashboard-state";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
        <div data-component="UploadPreview" className="flex min-h-full flex-1 flex-col bg-background">
            <Header
                monthLabel={ready ? state.workbook.monthLabel : undefined}
                counsellorCount={ready ? state.workbook.counsellors.length : undefined}
                teamCount={ready ? state.workbook.teams.length : undefined}
            />
            <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">Upload &amp; Import</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Drop a raw monthly workbook to preview how it parses. Nothing is saved until you switch to{" "}
                        <span className="font-medium text-foreground">Import</span>, review every row and confirm.
                    </p>
                </div>
                <UploadZone onFileSelected={handleFile} busy={state.status === "parsing"} />
                {state.status === "failed" && <ErrorState error={state.error} fileName={state.fileName} />}
                {ready && (
                    <>
                        <ParseReportPanel workbook={state.workbook} />
                        {canImport && <ModeSwitch mode={mode} onChange={setMode} />}
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
            </main>
            {ready && <Footer sourceFileName={state.workbook.sourceFileName} monthLabel={state.workbook.monthLabel} />}
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
            aria-pressed={mode === value}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                mode === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
        >
            {label}
        </button>
    );
    return (
        <div data-component="ModeSwitch" className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            {button("preview", "Preview")}
            {button("import", "Import into database")}
        </div>
    );
}
