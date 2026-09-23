"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import {
    FiAlertTriangle,
    FiCheckCircle,
    FiHeadphones,
    FiLayers,
    FiLink,
    FiTarget,
    FiTrendingUp,
    FiUsers,
} from "react-icons/fi";
import { Greeting } from "@/components/auth/constellation/Greeting";
import { Headline } from "@/components/auth/constellation/Headline";
import { mountScene } from "@/components/auth/constellation/scene";
import { Tagline } from "@/components/auth/constellation/Tagline";
import { Ticker } from "@/components/auth/constellation/Ticker";
import { FACTS, PEOPLE, REEL, TRACK, TYPED } from "@/components/auth/constellation/taglines";
import styles from "@/components/auth/constellation/LoginScene.module.css";

/** CSS-module lookup that always yields a string (the module type is indexed, so a raw lookup is `string | undefined`). */
const s = (name: string): string => styles[name] ?? "";

const TRACK_ICONS = [FiTarget, FiCheckCircle, FiUsers, FiLayers, FiHeadphones, FiAlertTriangle, FiTrendingUp, FiLink];

const SPARK_VALUES = [20, 24, 22, 30, 34, 31, 38, 44, 43, 52, 58, 61];

/** Static decorative sparkline for the "Trends" pill. */
function Spark({ className }: { className?: string }) {
    const w = 60;
    const h = 18;
    const min = Math.min(...SPARK_VALUES);
    const max = Math.max(...SPARK_VALUES);
    const points = SPARK_VALUES.map((v, i) => {
        const x = (i / (SPARK_VALUES.length - 1)) * w;
        const y = h - 2 - ((v - min) / (max - min)) * (h - 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return (
        <svg data-component="Spark" className={className} viewBox={`0 0 ${String(w)} ${String(h)}`} aria-hidden>
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

/** Floating feature pills around the hero (desktop only): position, icon, copy. */
const PILLS: { left: string; top: string; icon: typeof FiTarget; body: ReactNode }[] = [
    {
        left: "10%",
        top: "16%",
        icon: FiTarget,
        body: (
            <>
                <b>Targets</b> vs. achieved
            </>
        ),
    },
    {
        left: "86%",
        top: "18%",
        icon: FiCheckCircle,
        body: (
            <>
                <b>Applications</b> live
            </>
        ),
    },
    {
        left: "6%",
        top: "58%",
        icon: FiHeadphones,
        body: (
            <>
                <b>Call audits</b> · AQS
            </>
        ),
    },
    {
        left: "88%",
        top: "60%",
        icon: FiAlertTriangle,
        body: (
            <>
                <b>Discrepancies</b> flagged
            </>
        ),
    },
    {
        left: "14%",
        top: "84%",
        icon: FiLink,
        body: (
            <>
                <b>Meritto</b> synced
            </>
        ),
    },
    {
        left: "80%",
        top: "86%",
        icon: FiTrendingUp,
        body: (
            <>
                <b>Trends</b> month · year
                <Spark className={s("spark")} />
            </>
        ),
    },
];

/**
 * The sign-in page around the form: aurora + counsellor constellation on a canvas, scrambling headline with the
 * rotating tagline, the glass card (children = `LoginForm`), and two tickers. The `AuthHeader` above is
 * untouched. See `scene.ts` for the canvas loop and what keeps it cheap.
 */
export function LoginScene({ children }: { children: ReactNode }) {
    const rootRef = useRef<HTMLElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        const canvas = canvasRef.current;
        const label = labelRef.current;
        if (!root || !canvas || !label) return;
        const ui = `.${s("hd")},.${s("formcol")},.${s("tk")}`;
        return mountScene(
            {
                root,
                canvas,
                label,
                labelOnClass: s("labOn"),
                isUi: (target) => target.closest(ui) !== null,
            },
            PEOPLE,
        );
    }, []);

    return (
        <main data-component="LoginScene" ref={rootRef} className={s("scene")}>
            <span className={s("aur")} aria-hidden />
            <span className={`${s("aur")} ${s("aurB")}`} aria-hidden />
            <canvas ref={canvasRef} className={s("canvas")} aria-hidden />
            <div ref={labelRef} className={s("lab")} aria-hidden />
            {PILLS.map(({ left, top, icon: Icon, body }, i) => (
                <span key={i} className={s("pill")} style={{ left, top }} aria-hidden>
                    <Icon />
                    {body}
                </span>
            ))}

            <div className={s("hd")}>
                <div className={s("mark")} aria-hidden>
                    CP
                </div>
                <Headline lines={REEL} className={s("h1")} scrambleClass={s("sc")} landClass={s("ld")} />
                <p className={s("sub")}>
                    Counsellor Performance is <Tagline tails={TYPED} emClass={s("em")} />
                </p>
                <Greeting className={s("greet")} dotClass={s("dot")} />
            </div>

            <section className={s("formcol")}>
                <div className={`card card-pad stack ${s("glass")}`}>
                    <div className="text-center">
                        <h2 className="t-h1">Sign in</h2>
                    </div>
                    {children}
                </div>
            </section>

            <div className={s("tk")}>
                <Ticker
                    className={s("row")}
                    items={TRACK.map((label, i) => {
                        const Icon = TRACK_ICONS[i] ?? FiTarget;
                        return (
                            <Fragment key={label}>
                                <Icon />
                                Track {label}
                            </Fragment>
                        );
                    })}
                />
                <Ticker className={`${s("row")} ${s("rev")}`} items={FACTS} />
            </div>
        </main>
    );
}
