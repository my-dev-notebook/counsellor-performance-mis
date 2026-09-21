"use client";

import type { CSSProperties } from "react";
import { CursorHint, useCursorHint } from "@/components/CursorHint";
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

/**
 * Party flakes — the Green celebration. Every knob below was picked in the
 * design system's "Party flakes lab" card; change them there first, then here.
 */
const FLAKES = {
    count: 80,
    size: [4, 8],
    fall: [4, 8],
    sway: [4, 14],
    spin: [360, 1440],
    /** Share of the card height a flake crosses before it is gone. */
    travel: 0.7,
    opacity: 0.65,
    shapes: ["", "sq", "rib", "tri"],
    palette: ["var(--good)", "var(--accent)", "var(--warn)", "var(--series-5)", "var(--info)", "var(--series-3)"],
    seed: 656,
} as const;

/**
 * mulberry32 — the same generator, seed and draw order as the lab, so the
 * scene here is the one that was approved there. Deterministic so the server
 * and client render identical pieces (`Math.random()` would be a hydration
 * mismatch).
 */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0 || 1;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

interface Flake {
    shape: string;
    style: CSSProperties;
}

/** Inclusive integer in [lo, hi] from a unit random. */
function intBetween(r: number, [lo, hi]: readonly [number, number]): number {
    return lo + Math.floor(r * (hi - lo + 1));
}

const FLAKE_PIECES: Flake[] = (() => {
    const rand = seededRandom(FLAKES.seed);
    return Array.from({ length: FLAKES.count }, (_, i) => {
        const shape = FLAKES.shapes[Math.floor(rand() * FLAKES.shapes.length)] ?? "";
        const size = intBetween(rand(), FLAKES.size);
        const duration = FLAKES.fall[0] + rand() * (FLAKES.fall[1] - FLAKES.fall[0]);
        const spin = intBetween(rand(), FLAKES.spin);
        const sway = intBetween(rand(), FLAKES.sway);
        const x = Math.round(rand() * 100);
        const extraTravel = Math.floor(rand() * 20);
        const delay = rand() * duration;
        return {
            shape,
            style: {
                "--x": `${String(x)}%`,
                "--s": `${String(size)}px`,
                "--c": FLAKES.palette[i % FLAKES.palette.length],
                "--h": `calc(${String(FLAKES.travel * 100)}cqh + ${String(extraTravel)}px)`,
                "--d": `${duration.toFixed(1)}s`,
                "--dl": `-${delay.toFixed(1)}s`,
                "--rot": `${String(spin)}deg`,
                "--sw": `${String(sway)}px`,
                "--o": FLAKES.opacity,
            } as CSSProperties,
        };
    });
})();

/** Loops for as long as the gauge is Green. Hidden for reduced-motion users. */
function Flakes() {
    return (
        <div data-component="Flakes" aria-hidden="true" className="flakes">
            {FLAKE_PIECES.map((piece, i) => (
                <span key={i} className={`fk ${piece.shape}`} style={piece.style} />
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

type Segment = "done" | "left";

/** Hit area around the arc — wider than the track so the edges are easy to catch. */
const HIT_WIDTH = TRACK_WIDTH + 10;

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
    const { hint: hover, follow, leave } = useCursorHint<Segment>();

    // Hover copy: the filled arc is what's done, the rest of the track is what's left to the target.
    // Over 100% there is no empty arc; the filled one then carries the overshoot.
    const left = Math.max(0, summary.target - summary.achieved);
    const over = Math.max(0, summary.achieved - summary.target);
    const hoverText: Record<Segment, string> = {
        done:
            over > 0
                ? `${formatInt(summary.achieved)} applications achieved · ${formatInt(over)} over target`
                : `${formatInt(summary.achieved)} applications achieved (${formatPct(pct)})`,
        left: `${formatInt(left)} applications left to target`,
    };

    return (
        <div data-component="TargetGauge" className="gauge card card-pad">
            {status === "Green" && <Flakes />}
            <div className="kpi-label w-full">
                <span>Target vs achieved</span>
            </div>
            <svg
                viewBox="0 0 200 118"
                className="dial mt-1"
                role="img"
                aria-label={`Achieved ${formatInt(summary.achieved)} of target ${formatInt(summary.target)} (${formatPct(pct)})`}
            >
                {/* Track: the band's soft tint, so state reads across the whole arc. Thickens under the pointer. */}
                <path
                    d={ARC}
                    fill="none"
                    stroke={track}
                    strokeWidth={hover?.key === "left" ? TRACK_WIDTH + 3 : TRACK_WIDTH}
                    strokeLinecap="round"
                    className="seg"
                />
                {frac > 0 && (
                    <path
                        d={ARC}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={hover?.key === "done" ? TRACK_WIDTH + 3 : TRACK_WIDTH}
                        strokeLinecap="round"
                        pathLength={1}
                        strokeDasharray={`${String(frac)} 1`}
                        className="seg"
                    />
                )}
                {/* Invisible hit areas: the empty part of the track first, the filled part on top of it. */}
                {pct !== null && frac < 1 && (
                    <path
                        d={ARC}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={HIT_WIDTH}
                        pathLength={1}
                        strokeDasharray={`${String(1 - frac)} 1`}
                        strokeDashoffset={-frac}
                        onMouseEnter={follow("left")}
                        onMouseMove={follow("left")}
                        onMouseLeave={leave}
                    />
                )}
                {pct !== null && frac > 0 && (
                    <path
                        d={ARC}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={HIT_WIDTH}
                        strokeLinecap="round"
                        pathLength={1}
                        strokeDasharray={`${String(frac)} 1`}
                        onMouseEnter={follow("done")}
                        onMouseMove={follow("done")}
                        onMouseLeave={leave}
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
            {hover && <CursorHint x={hover.x} y={hover.y} text={hoverText[hover.key]} />}
        </div>
    );
}
