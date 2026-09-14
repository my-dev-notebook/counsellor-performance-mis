"use client";

import { useMemo, useState } from "react";
import { DEFAULT_FILTERS, applyFilters } from "@/lib/filters";
import type { Filters } from "@/lib/filters";
import { summarize } from "@/lib/metrics/summarize";
import type { ParsedWorkbook } from "@/schemas/parser";
import { FilterBar } from "@/components/filters/FilterBar";
import type { FilterField } from "@/components/filters/FilterBar";
import { KpiCards } from "@/components/kpi/KpiCards";
import { TeamPerformancePanel } from "@/components/team/TeamPerformancePanel";
import { PerformanceHealthPanel } from "@/components/health/PerformanceHealthPanel";
import { CounsellorTable } from "@/components/table/CounsellorTable";

/**
 * The filter-driven dashboard body shared by the company and team views:
 * a filter bar over KPI cards, team bars, health buckets and the counsellor
 * table. The role views only decide which filters it offers.
 */
export function FilteredDashboard({
    workbook,
    fields,
    showTeamPanel = true,
}: {
    workbook: ParsedWorkbook;
    fields: readonly FilterField[];
    showTeamPanel?: boolean;
}) {
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

    const filtered = useMemo(() => applyFilters(workbook.counsellors, filters), [workbook, filters]);
    const summary = useMemo(() => summarize(filtered), [filtered]);

    return (
        <div data-component="FilteredDashboard" className="space-y-6">
            <FilterBar
                counsellors={workbook.counsellors}
                agencies={workbook.agencies}
                filters={filters}
                fields={fields}
                onChange={setFilters}
                onReset={() => {
                    setFilters(DEFAULT_FILTERS);
                }}
            />
            <KpiCards summary={summary} />
            <div className={`grid grid-cols-1 gap-6 ${showTeamPanel ? "lg:grid-cols-2" : ""}`}>
                {showTeamPanel && (
                    <section className="rounded-lg border border-border bg-card p-4">
                        <h2 className="mb-3 text-sm font-semibold text-foreground">Team Performance</h2>
                        <TeamPerformancePanel counsellors={filtered} />
                    </section>
                )}
                <section>
                    <h2 className="mb-3 text-sm font-semibold text-foreground">Performance Health</h2>
                    <PerformanceHealthPanel counsellors={filtered} />
                </section>
            </div>
            <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Counsellors</h2>
                <CounsellorTable counsellors={filtered} />
            </section>
        </div>
    );
}
