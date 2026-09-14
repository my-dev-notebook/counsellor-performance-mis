"use client";

import type { ParsedWorkbook } from "@/schemas/parser";
import { ALL_FILTER_FIELDS } from "@/components/filters/FilterBar";
import { FilteredDashboard } from "@/components/dashboard/FilteredDashboard";

/** All-teams readers (admin, MIS executive) and the ad-hoc Excel preview: every filter, every panel. */
export function CompanyDashboard({ workbook }: { workbook: ParsedWorkbook }) {
    return (
        <div data-component="CompanyDashboard">
            <FilteredDashboard workbook={workbook} fields={ALL_FILTER_FIELDS} />
        </div>
    );
}
