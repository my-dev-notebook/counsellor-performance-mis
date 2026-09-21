import { FiAlertTriangle, FiCheckCircle, FiHelpCircle, FiXCircle } from "react-icons/fi";
import type { IconType } from "react-icons";
import type { Status } from "@/schemas/parser";

/** Everything the UI needs to speak about a performance band, keyed by the parser's `Status`. */
export const STATUS_META: Record<
    Status,
    { label: string; pill: string; meter: string; icon: IconType; color: string; softFg: string }
> = {
    Green: {
        label: "Green · ≥ 90%",
        pill: "pill-good",
        meter: "good",
        icon: FiCheckCircle,
        color: "var(--good)",
        softFg: "var(--good-soft-fg)",
    },
    Yellow: {
        label: "Yellow · 60–89%",
        pill: "pill-warn",
        meter: "warn",
        icon: FiAlertTriangle,
        color: "var(--warn)",
        softFg: "var(--warn-soft-fg)",
    },
    Red: {
        label: "Red · < 60%",
        pill: "pill-bad",
        meter: "bad",
        icon: FiXCircle,
        color: "var(--bad)",
        softFg: "var(--bad-soft-fg)",
    },
    // Unknown is its own band ("no target"), never folded into Red.
    Unknown: {
        label: "No target",
        pill: "pill-neutral",
        meter: "neutral",
        icon: FiHelpCircle,
        color: "var(--line-3)",
        softFg: "var(--ink-3)",
    },
};

/** Row-edge accent colour for a band (tables carry the band by colour, not by a status column). */
export function statusAccent(status: Status): string {
    return STATUS_META[status].color;
}

/** Text colour for a band's headline figure (e.g. the Ach % cell). */
export function statusTextColor(status: Status): string {
    return STATUS_META[status].softFg;
}

/** Band pill with icon; `long` spells out the threshold ("Green · ≥ 90%") for headlines and drill-downs. */
export function StatusPill({
    status,
    long = false,
    className = "",
}: {
    status: Status;
    long?: boolean;
    className?: string;
}) {
    const meta = STATUS_META[status];
    const Icon = meta.icon;
    return (
        <span data-component="StatusPill" className={`pill ${meta.pill} ${className}`}>
            <Icon aria-hidden />
            {long ? meta.label : status === "Unknown" ? "No target" : status}
        </span>
    );
}

/** Band cut-offs per scale: achievement (target %) or audit quality score. */
const LEGEND_LABELS = {
    achievement: { good: "≥ 90%", warn: "60–89%", bad: "< 60%", neutral: "no target" },
    aqs: { good: "100%", warn: "88–99%", bad: "< 88%", neutral: null },
} as const;

/** One legend entry per band, for a table footer. */
export function BandLegend({ scale = "achievement" }: { scale?: keyof typeof LEGEND_LABELS }) {
    const labels = LEGEND_LABELS[scale];
    return (
        <span data-component="BandLegend" className="legend">
            <span>
                <i style={{ background: "var(--good)" }} />
                {labels.good}
            </span>
            <span>
                <i style={{ background: "var(--warn)" }} />
                {labels.warn}
            </span>
            <span>
                <i style={{ background: "var(--bad)" }} />
                {labels.bad}
            </span>
            {labels.neutral && (
                <span>
                    <i style={{ background: "var(--line-3)" }} />
                    {labels.neutral}
                </span>
            )}
        </span>
    );
}
