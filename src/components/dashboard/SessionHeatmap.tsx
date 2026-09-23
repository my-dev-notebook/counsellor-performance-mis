"use client";

import { useMemo, useSyncExternalStore, type CSSProperties } from "react";
import { formatInt } from "@/lib/format";
import { cellTone } from "@/lib/admissions/calendar-tone";
import { Tooltip } from "@/components/Tooltip";

/** One day's admission count, as `getDailyAdmissionCountsForSession` returns it. */
export interface DailyCount {
    date: string;
    count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** Weeks start Monday; only every other row is labelled, as in the design. */
const DOW_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/** Dates are handled in UTC so the grid never shifts a day with the viewer's timezone. */
function toDayDate(d: Date): string {
    return `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** "Wed 01 Oct 2025" */
function formatDay(d: Date): string {
    return `${WEEKDAY_ABBR[d.getUTCDay()] ?? ""} ${String(d.getUTCDate()).padStart(2, "0")} ${MONTH_ABBR[d.getUTCMonth()] ?? ""} ${String(d.getUTCFullYear())}`;
}

function todayDayDate(): string {
    const now = new Date();
    return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const noSubscribe = () => () => undefined;

/**
 * The viewer's local date, or null while server-rendering and hydrating: the
 * server's clock (UTC on the edge) can be a day off from the browser's, and a
 * render-time date would then fail hydration. The client re-renders with it
 * straight after.
 */
function useToday(): string | null {
    return useSyncExternalStore(noSubscribe, todayDayDate, () => null);
}

/**
 * The monthly admissions calendar stretched over a whole session (October →
 * September), GitHub-style: one column per week (Monday first), one row per
 * weekday, tinted by the day's count relative to the session's best day.
 * Hovering a day shows its count; month labels sit over the week holding the 1st.
 */
export function SessionHeatmap({ sessionYear, days }: { sessionYear: string; days: readonly DailyCount[] }) {
    const end = Number.parseInt(sessionYear, 10);
    const start = Date.UTC(end - 1, 9, 1);
    const dayCount = Math.round((Date.UTC(end, 9, 1) - start) / DAY_MS);
    const leadingBlanks = (new Date(start).getUTCDay() + 6) % 7;
    const weeks = Math.ceil((leadingBlanks + dayCount) / 7);
    const today = useToday();

    const byDate = useMemo(() => new Map(days.map((d) => [d.date, d.count])), [days]);
    const total = days.reduce((sum, d) => sum + d.count, 0);
    const best = days.reduce<DailyCount | null>((top, d) => (top === null || d.count > top.count ? d : top), null);
    const maxCount = best?.count ?? 0;

    const months = Array.from({ length: 12 }, (_, i) => {
        const first = Date.UTC(end - 1, 9 + i, 1);
        const next = Date.UTC(end - 1, 10 + i, 1);
        const column = (at: number) => Math.floor((leadingBlanks + Math.round((at - start) / DAY_MS)) / 7) + 1;
        return {
            label: MONTH_ABBR[new Date(first).getUTCMonth()] ?? "",
            from: column(first),
            to: i === 11 ? weeks + 1 : column(next),
        };
    });

    return (
        <div data-component="SessionHeatmap" className="card">
            <div className="card-head">
                <h3 className="card-title">Daily applications · Session {sessionYear}</h3>
                <span className="card-meta">
                    {formatInt(total)} in session
                    {best !== null &&
                        ` · best day ${formatDay(new Date(`${best.date}T00:00:00Z`))} (${formatInt(best.count)})`}
                </span>
            </div>
            <div className="card-pad">
                <div className="yh-wrap">
                    <div className="yh" style={{ "--yh-weeks": weeks } as CSSProperties}>
                        <div />
                        <div className="months" style={{ gridTemplateColumns: `repeat(${String(weeks)}, var(--yh-cell))` }}>
                            {months.map((m) => (
                                <span key={m.label} style={{ gridColumn: `${String(m.from)} / ${String(m.to)}` }}>
                                    {m.label}
                                </span>
                            ))}
                        </div>
                        <div className="dows">
                            {DOW_LABELS.map((label, i) => (
                                <span key={i}>{label}</span>
                            ))}
                        </div>
                        <div className="cells">
                            {Array.from({ length: leadingBlanks }, (_, i) => (
                                <span key={`blank-${String(i)}`} className="c blank" />
                            ))}
                            {Array.from({ length: dayCount }, (_, i) => {
                                const d = new Date(start + i * DAY_MS);
                                const date = toDayDate(d);
                                const count = byDate.get(date) ?? 0;
                                const label = `${formatDay(d)} · ${formatInt(count)} ${count === 1 ? "application" : "applications"}`;
                                return (
                                    <Tooltip key={date} content={label}>
                                        <span
                                            role="img"
                                            aria-label={label}
                                            className={`c ${cellTone(count, maxCount)} ${today !== null && date === today ? "today" : ""} ${today !== null && date > today ? "future" : ""}`}
                                        />
                                    </Tooltip>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="yh-foot">
                    <span>Hover a day for the count</span>
                    <span className="row items-center gap-1">
                        Less
                        {["h1", "h2", "h3", "h4", "h5"].map((tone) => (
                            <span key={tone} className={`yh-swatch ${tone}`} />
                        ))}
                        More
                    </span>
                </div>
            </div>
        </div>
    );
}
