import { statusTextColor } from "@/components/StatusPill";
import { aqsPercent, aqsStatus } from "@/schemas/call-audit";

/** Audit quality score for a table cell: the figure alone, coloured by its band (the row edge carries the accent). */
export function AqsCell({ aqs }: { aqs: number }) {
    return (
        <b data-component="AqsCell" className="t-num" style={{ color: statusTextColor(aqsStatus(aqs)) }}>
            {`${String(aqsPercent(aqs))}%`}
        </b>
    );
}
