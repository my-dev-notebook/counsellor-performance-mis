import { StatusPill } from "@/components/StatusPill";
import { aqsPercent, aqsStatus } from "@/schemas/call-audit";

/** AQS as a rounded "88%" beside its Green / Yellow / Red band. */
export function AqsPill({ aqs }: { aqs: number }) {
    return (
        <span data-component="AqsPill" className="inline-flex items-center gap-2">
            <span className="font-medium text-foreground tabular-nums">{`${String(aqsPercent(aqs))}%`}</span>
            <StatusPill status={aqsStatus(aqs)} />
        </span>
    );
}
