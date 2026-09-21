import { StatusPill } from "@/components/StatusPill";
import { aqsPercent, aqsStatus } from "@/schemas/call-audit";

/** Audit quality score with its band pill — for headline slots (form result, drill-downs), not table columns. */
export function AqsPill({ aqs }: { aqs: number }) {
    return (
        <span data-component="AqsPill" className="inline-flex items-center gap-2">
            <span className="t-num font-medium">{`${String(aqsPercent(aqs))}%`}</span>
            <StatusPill status={aqsStatus(aqs)} />
        </span>
    );
}
