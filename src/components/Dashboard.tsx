"use client";

import { useMemo, useState } from "react";
import { DEFAULT_FILTERS, applyFilters } from "@/lib/filters";
import type { Filters } from "@/lib/filters";
import { summarize } from "@/lib/metrics/summarize";
import type { ParsedWorkbook } from "@/schemas/parser";
import { FilterBar } from "@/components/filters/FilterBar";
import { KpiCards } from "@/components/kpi/KpiCards";
import { TeamPerformancePanel } from "@/components/team/TeamPerformancePanel";
import { PerformanceHealthPanel } from "@/components/health/PerformanceHealthPanel";
import { CounsellorTable } from "@/components/table/CounsellorTable";

export function Dashboard({ workbook }: { workbook: ParsedWorkbook }) {
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const filtered = useMemo(() => applyFilters(workbook.counsellors, filters), [workbook, filters]);
    const summary = useMemo(() => summarize(filtered), [filtered]);

    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setSelectedId(null);
    };

    const toggleSelected = (id: string) => {
        setSelectedId((prev) => (prev === id ? null : id));
    };

    return (
        <div data-component="Dashboard" className="space-y-6">
            <FilterBar
                counsellors={workbook.counsellors}
                agencies={workbook.agencies}
                filters={filters}
                onChange={setFilters}
                onReset={resetFilters}
            />
            <KpiCards summary={summary} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="rounded-lg border border-border bg-card p-4">
                    <h2 className="mb-3 text-sm font-semibold text-foreground">Team Performance</h2>
                    <TeamPerformancePanel counsellors={filtered} />
                </section>
                <section>
                    <h2 className="mb-3 text-sm font-semibold text-foreground">Performance Health</h2>
                    <PerformanceHealthPanel counsellors={filtered} />
                </section>
            </div>
            <section>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Counsellors</h2>
                <CounsellorTable counsellors={filtered} selectedId={selectedId} onSelect={toggleSelected} />
            </section>
        </div>
    );
}
