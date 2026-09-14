"use client";

import type { ParsedWorkbook } from "@/schemas/parser";
import { FilteredDashboard } from "@/components/dashboard/FilteredDashboard";

/** A team leader sees one team, so Team and Agency filters and the team-vs-team bars are dropped. */
export function TeamDashboard({ workbook }: { workbook: ParsedWorkbook }) {
    return (
        <div data-component="TeamDashboard">
            <FilteredDashboard workbook={workbook} fields={["status", "counsellor"]} showTeamPanel={false} />
        </div>
    );
}
