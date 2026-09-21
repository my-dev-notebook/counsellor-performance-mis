import type { CSSProperties } from "react";
import type { Summary } from "@/lib/metrics/summarize";
import type { Status } from "@/schemas/parser";
import { deriveStatus } from "@/lib/metrics/buckets";
import { formatInt, formatPct } from "@/lib/format";
import { StatusPill } from "@/components/StatusPill";

/** Status tokens as CSS vars so SVG strokes follow the theme: arc = band colour, track = its soft tint. */
const STATUS_STROKE: Record<Status, { arc: string; track: string }> = {
    Green: { arc: "var(--good)", track: "var(--good-soft)" },
    Yellow: { arc: "var(--warn)", track: "var(--warn-soft)" },
    Red: { arc: "var(--bad)", track: "var(--bad-soft)" },
    Unknown: { arc: "var(--neutral)", track: "var(--neutral-soft)" },
};

/** Celebration only — chart series colours, never the status set, so the burst doesn't read as data. */
const CONFETTI_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

/**
 * Deterministic pseudo-random (LCG) so the server and client render identical
 * pieces — `Math.random()` here would be a hydration mismatch.
 */
function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

interface ConfettiPiece {
    dx: string;
    dy: string;
    rot: string;
    delay: string;
    color: string;
    round: boolean;
}

/** 28 pieces fanned across the top half-circle, so they burst up and out from the needle hub. */
const CONFETTI_PIECES: ConfettiPiece[] = (() => {
    const rand = seededRandom(7);
    return Array.from({ length: 28 }, (_, i) => {
        const angle = Math.PI * (0.1 + 0.8 * rand());
        const distance = 70 + 80 * rand();
        return {
            dx: `${(Math.cos(angle) * distance).toFixed(0)}px`,
            dy: `${(-Math.sin(angle) * distance).toFixed(0)}px`,
            rot: `${(360 + 540 * rand()).toFixed(0)}deg`,
            delay: `${(rand() * 0.25).toFixed(2)}s`,
            color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "var(--series-1)",
            round: i % 4 === 0,
        };
    });
})();

/** Bursts on a loop for as long as the gauge is Green. Hidden for reduced-motion users. */
function Confetti() {
    return (
        <div data-component="Confetti" aria-hidden="true" className="confetti">
            {CONFETTI_PIECES.map((piece, i) => (
                <span
                    key={i}
                    className={`cf ${piece.round ? "h-2 w-2 rounded-full" : ""}`}
                    style={
                        {
                            backgroundColor: piece.color,
                            "--dx": piece.dx,
                            "--dy": piece.dy,
                            "--rot": piece.rot,
                            "--delay": piece.delay,
                        } as CSSProperties
                    }
                />
            ))}
        </div>
    );
}

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
    const { arc: stroke, track } = STATUS_STROKE[status];
    const frac = pct === null ? 0 : Math.min(1, Math.max(0, pct));
    const needleTip = pointAt(frac, RADIUS - TRACK_WIDTH - 10);

    return (
        <div data-component="TargetGauge" className="gauge card card-pad">
            {status === "Green" && <Confetti />}
            <div className="kpi-label w-full">
                <span>Target vs achieved</span>
            </div>
            <svg
                viewBox="0 0 200 118"
                className="dial mt-1"
                role="img"
                aria-label={`Achieved ${formatInt(summary.achieved)} of target ${formatInt(summary.target)} (${formatPct(pct)})`}
            >
                {/* Track: the band's soft tint, so state reads across the whole arc. */}
                <path d={ARC} fill="none" stroke={track} strokeWidth={TRACK_WIDTH} strokeLinecap="round" />
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
                            stroke="var(--ink-3)"
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
                            stroke="var(--ink-1)"
                            strokeWidth={2}
                            strokeLinecap="round"
                        />
                        <circle cx={CX} cy={CY} r={4} fill="var(--ink-1)" />
                    </>
                )}
                <text x={CX - RADIUS} y={116} textAnchor="middle" fontSize={9} fill="var(--ink-3)">
                    0
                </text>
                <text x={CX + RADIUS} y={116} textAnchor="middle" fontSize={9} fill="var(--ink-3)">
                    100%
                </text>
            </svg>
            <div className="kpi-value t-num">{formatPct(pct)}</div>
            <div className="kpi-foot justify-center">
                {formatInt(summary.achieved)} of {formatInt(summary.target)} achieved
            </div>
            <StatusPill status={status} long className="mt-1" />
        </div>
    );
}
