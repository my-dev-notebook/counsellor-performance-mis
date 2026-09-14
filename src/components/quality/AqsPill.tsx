import { StatusPill } from "@/components/StatusPill";
import { aqsStatus } from "@/schemas/call-audit";
import { formatPct } from "@/lib/format";

/** AQS as "100.0%" beside its Green / Yellow / Red band. */
export function AqsPill({ aqs }: { aqs: number }) {
    return (
        <span data-component="AqsPill" className="inline-flex items-center gap-2">
            <span className="font-medium text-foreground tabular-nums">{formatPct(aqs, 1)}</span>
            <StatusPill status={aqsStatus(aqs)} />
        </span>
    );
}
