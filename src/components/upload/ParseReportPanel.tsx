"use client";

import { useState } from "react";
import type { ParsedWorkbook, WarningLevel } from "@/lib/parser/schemas";

const LEVEL_STYLES: Record<WarningLevel, string> = {
  info: "bg-sky-50 text-sky-700 ring-sky-600/20",
  warn: "bg-amber-50 text-amber-800 ring-amber-600/20",
  error: "bg-red-50 text-red-800 ring-red-600/20",
};

export function ParseReportPanel({ workbook }: { workbook: ParsedWorkbook }) {
  const [open, setOpen] = useState(false);
  const ignored = workbook.warnings.filter((w) => w.code === "SHEET_IGNORED");
  const otherWarnings = workbook.warnings.filter((w) => w.code !== "SHEET_IGNORED");

  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-zinc-900">
          Parse Report — {workbook.teams.length} sheet{workbook.teams.length === 1 ? "" : "s"} read,{" "}
          {ignored.length} ignored, {workbook.warnings.length} warning
          {workbook.warnings.length === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-zinc-500">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-zinc-200 px-4 py-4">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Sheets read
            </h3>
            <ul className="mt-2 space-y-1 text-sm text-zinc-700">
              {workbook.teams.map((team) => (
                <li key={team.team}>
                  {team.team} — {team.headcount} row{team.headcount === 1 ? "" : "s"}
                  {team.reconciles === false && (
                    <span className="ml-2 text-amber-700">(total mismatch)</span>
                  )}
                  {team.reconciles === null && (
                    <span className="ml-2 text-zinc-400">(no total row to check)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          {ignored.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                Sheets ignored
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700">
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
              <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
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
                    <span className="text-zinc-700">
                      {w.sheet && <span className="font-medium">{w.sheet}</span>}
                      {w.row !== undefined && (
                        <span className="text-zinc-400"> row {w.row}</span>
                      )} — {w.message}
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
