import type { Summary } from "@/lib/metrics/summarize";
import type { Status } from "@/schemas/parser";
import { deriveStatus } from "@/lib/metrics/buckets";
import { formatInt, formatPct } from "@/lib/format";

/** Same status hues as StatusPill / the health panel, as CSS vars so SVG strokes follow the theme. */
const STATUS_STROKE: Record<Status, string> = {
    Green: "var(--success)",
    Yellow: "var(--warning)",
    Red: "var(--destructive)",
    Unknown: "var(--muted-foreground)",
};

const CX = 100;
const CY = 100;
const RADIUS = 80;
const TRACK_WIDTH = 12;
/** Status band boundaries (see deriveStatus), drawn as tick marks just outside the arc. */
const BAND_TICKS = [0.6, 0.9];

/** Point on a circle of radius `r` around the hub, `frac` of the way along the half-circle sweep (0 = left, 1 = right). */
function pointAt(frac: number, r: number): { x: number; y: number } {
    const angle = Math.PI * (1 - frac);
    return { x: CX + r * Math.cos(angle), y: CY - r * Math.sin(angle) };
}

const ARC = `M ${String(CX - RADIUS)} ${String(CY)} A ${String(RADIUS)} ${String(RADIUS)} 0 0 1 ${String(CX + RADIUS)} ${String(CY)}`;

/**
 * Half-circle speedometer for the filtered set's Achieved against its Target.
 * The arc fills to Achievement % (capped at the 100% mark — over-achievement
 * shows a full arc and the real figure below), coloured by the same
 * Green/Yellow/Red band as every other status mark.
 */
export function TargetGauge({ summary }: { summary: Summary }) {
    const pct = summary.pctAchieved;
    const status = deriveStatus(pct);
    const stroke = STATUS_STROKE[status];
    const frac = pct === null ? 0 : Math.min(1, Math.max(0, pct));
    const needleTip = pointAt(frac, RADIUS - TRACK_WIDTH - 10);

    return (
        <div
            data-component="TargetGauge"
            className="flex flex-col items-center rounded-lg border border-border bg-card p-4"
        >
            <p className="self-start text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Target vs Achieved
            </p>
            <svg
                viewBox="0 0 200 118"
                className="mt-2 w-full max-w-[220px]"
                role="img"
                aria-label={`Achieved ${formatInt(summary.achieved)} of target ${formatInt(summary.target)} (${formatPct(pct)})`}
            >
                {/* Track: a lighter tint of the fill colour, so state reads across the whole arc. */}
                <path
                    d={ARC}
                    fill="none"
                    stroke={stroke}
                    strokeOpacity={0.18}
                    strokeWidth={TRACK_WIDTH}
                    strokeLinecap="round"
                />
                {frac > 0 && (
                    <path
                        d={ARC}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={TRACK_WIDTH}
                        strokeLinecap="round"
                        pathLength={1}
                        strokeDasharray={`${String(frac)} 1`}
                    />
                )}
                {BAND_TICKS.map((tick) => {
                    const from = pointAt(tick, RADIUS + TRACK_WIDTH / 2 + 4);
                    const to = pointAt(tick, RADIUS + TRACK_WIDTH / 2 + 9);
                    return (
                        <line
                            key={tick}
                            x1={from.x}
                            y1={from.y}
                            x2={to.x}
                            y2={to.y}
                            stroke="var(--muted-foreground)"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                        />
                    );
                })}
                {pct !== null && (
                    <>
                        <line
                            x1={CX}
                            y1={CY}
                            x2={needleTip.x}
                            y2={needleTip.y}
                            stroke="var(--foreground)"
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                        <circle cx={CX} cy={CY} r={4} fill="var(--foreground)" />
                    </>
                )}
                <text x={CX - RADIUS} y={116} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                    0
                </text>
                <text x={CX + RADIUS} y={116} textAnchor="middle" className="fill-muted-foreground text-[9px]">
                    100%
                </text>
            </svg>
            <p className="mt-1 text-2xl font-semibold text-foreground">{formatPct(pct)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
                {formatInt(summary.achieved)} of {formatInt(summary.target)} achieved
            </p>
        </div>
    );
}
