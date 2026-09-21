"use client";

import { useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
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
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => applyFilters(workbook.counsellors, filters), [workbook, filters]);
    const summary = useMemo(() => summarize(filtered), [filtered]);
    const searched = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q === "" ? filtered : filtered.filter((c) => c.name.toLowerCase().includes(q));
    }, [filtered, search]);

    return (
        <div data-component="FilteredDashboard" className="stack gap-5">
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
            <div className={`grid grid-cols-1 gap-4 ${showTeamPanel ? "lg:grid-cols-2" : ""}`}>
                <section className="card">
                    <div className="card-head">
                        <h2 className="card-title">Performance health</h2>
                        <span className="card-meta">counsellors per band</span>
                    </div>
                    <div className="card-pad">
                        <PerformanceHealthPanel counsellors={filtered} />
                    </div>
                </section>
                {showTeamPanel && (
                    <section className="card">
                        <div className="card-head">
                            <h2 className="card-title">Team performance</h2>
                            <span className="card-meta">achieved / target</span>
                        </div>
                        <div className="card-pad">
                            <TeamPerformancePanel counsellors={filtered} />
                        </div>
                    </section>
                )}
            </div>
            <section className="stack gap-3">
                <div className="row justify-between">
                    <h2 className="t-h3">Counsellors</h2>
                    <div className="input-wrap w-60">
                        <FiSearch className="lead" aria-hidden />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                            }}
                            placeholder="Search counsellors…"
                            aria-label="Search counsellors"
                            className="input input-sm"
                        />
                    </div>
                </div>
                <CounsellorTable counsellors={searched} />
            </section>
        </div>
    );
}
