"use client";

import { useCallback, useState } from "react";
import type { DashboardState } from "@/lib/dashboard-state";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UploadZone } from "@/components/upload/UploadZone";
import { ParseReportPanel } from "@/components/upload/ParseReportPanel";
import { ErrorState } from "@/components/ErrorState";
import { Dashboard } from "@/components/Dashboard";

export default function UploadPreviewPage() {
  const [state, setState] = useState<DashboardState>({ status: "idle" });

  const handleFile = useCallback((file: File) => {
    setState({ status: "parsing", fileName: file.name });
    void file.arrayBuffer().then(async (buffer) => {
      // Dynamic import: `exceljs` must never be evaluated during SSR on the
      // Workers runtime (it calls `process.umask()` at module-load time,
      // which `unenv`'s Node compat shim doesn't implement) — only load it
      // client-side, on demand.
      const { parseWorkbook } = await import("@/lib/parser/parse-workbook");
      const result = await parseWorkbook(buffer, file.name);
      result.match(
        (workbook) => {
          setState({ status: "ready", workbook });
        },
        (error) => {
          setState({ status: "failed", error, fileName: file.name });
        },
      );
    });
  }, []);

  return (
    <div data-component="UploadPreviewPage" className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <Header
        monthLabel={state.status === "ready" ? state.workbook.monthLabel : undefined}
        counsellorCount={state.status === "ready" ? state.workbook.counsellors.length : undefined}
        teamCount={state.status === "ready" ? state.workbook.teams.length : undefined}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Upload &amp; Preview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drop a raw monthly workbook to preview how it parses. This is a scratch view only — nothing
            here is saved to the database. To record official figures, use{" "}
            <span className="font-medium text-zinc-700">Monthly Entry</span> instead.
          </p>
        </div>
        <UploadZone onFileSelected={handleFile} busy={state.status === "parsing"} />
        {state.status === "failed" && <ErrorState error={state.error} fileName={state.fileName} />}
        {state.status === "ready" && (
          <>
            <ParseReportPanel workbook={state.workbook} />
            <Dashboard workbook={state.workbook} />
          </>
        )}
      </main>
      {state.status === "ready" && (
        <Footer
          sourceFileName={state.workbook.sourceFileName}
          monthLabel={state.workbook.monthLabel}
        />
      )}
    </div>
  );
}
