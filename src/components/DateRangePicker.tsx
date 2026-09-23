"use client";

import { useCallback, useRef, useState } from "react";
import { FiArrowRight, FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MONTH_NAMES } from "@/lib/format";
import { Popover } from "@/components/Popover";
import { WEEKDAY_LABELS, formatDayDate, parseDayDate, toDayDate, todayParts } from "@/components/DatePicker";

/** Inclusive day range, both ends "YYYY-MM-DD". */
export interface DayRange {
    from: string;
    to: string;
}

interface MonthView {
    year: number;
    month: number;
}

function fromDate(d: Date): string {
    return toDayDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function shift(view: MonthView, delta: number): MonthView {
    const index = view.year * 12 + (view.month - 1) + delta;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Left-hand month when the calendar opens: the start's month, unless that would push the end off the right-hand month. */
function seedView(range: DayRange): MonthView {
    const from = parseDayDate(range.from);
    const to = parseDayDate(range.to);
    if (!from) return shift(todayParts(), -1);
    if (to && to.year * 12 + to.month > from.year * 12 + from.month + 1) return shift(to, -1);
    if (to && to.year === from.year && to.month === from.month) return shift(from, -1);
    return { year: from.year, month: from.month };
}

function dayCount(from: string, to: string): number {
    const a = parseDayDate(from);
    const b = parseDayDate(to);
    if (!a || !b) return 0;
    return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000) + 1;
}

const PRESETS: { label: string; range: () => DayRange }[] = [
    {
        label: "Today",
        range: () => {
            const t = fromDate(new Date());
            return { from: t, to: t };
        },
    },
    {
        label: "This week",
        range: () => {
            const now = new Date();
            return { from: fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())), to: fromDate(now) };
        },
    },
    {
        label: "Last 7 days",
        range: () => {
            const now = new Date();
            return { from: fromDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: fromDate(now) };
        },
    },
    {
        label: "Month to date",
        range: () => {
            const now = new Date();
            return { from: fromDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: fromDate(now) };
        },
    },
    {
        label: "Last month",
        range: () => {
            const now = new Date();
            return {
                from: fromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
                to: fromDate(new Date(now.getFullYear(), now.getMonth(), 0)),
            };
        },
    },
    {
        label: "Quarter to date",
        range: () => {
            const now = new Date();
            return { from: fromDate(new Date(now.getFullYear(), now.getMonth() - (now.getMonth() % 3), 1)), to: fromDate(now) };
        },
    },
];

/**
 * One-trigger date range picker (design system: Extended > "Date range"):
 * a segmented from -> to trigger opening presets plus two months side by side.
 * Opening starts a fresh pick: the first day click sets the start (clearing
 * the end), the second sets the end and closes. The highlighted trigger half
 * is the end the next click sets; clicking the other half switches it. The
 * draft shows live in the trigger and is reported through `onChange` on close
 * only when both ends are set -- closing half-way keeps the old range.
 */
export function DateRangePicker({
    value,
    onChange,
    size = "md",
    disabled = false,
    "aria-label": ariaLabel,
}: {
    value: DayRange;
    onChange: (value: DayRange) => void;
    size?: "sm" | "md";
    disabled?: boolean;
    "aria-label"?: string;
}) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const [view, setView] = useState(() => seedView(value));
    // The range being edited while the calendar is open; null when closed.
    const [draft, setDraft] = useState<DayRange | null>(null);
    const [edge, setEdge] = useState<"from" | "to">("from");
    const [hover, setHover] = useState<string | null>(null);
    const open = draft !== null;
    const shown = draft ?? value;

    const finish = useCallback(
        (range: DayRange | null) => {
            setDraft(null);
            setHover(null);
            if (range && range.from !== "" && range.to !== "" && (range.from !== value.from || range.to !== value.to)) {
                onChange(range);
            }
        },
        [onChange, value.from, value.to],
    );

    const close = useCallback(() => {
        finish(draft);
    }, [finish, draft]);

    // Opening always starts a fresh pick at the start date; once open, the trigger halves switch
    // which end the next click sets.
    const focusEdge = (next: "from" | "to") => {
        if (!open) {
            setView(seedView(value));
            setDraft(value);
            setEdge("from");
            return;
        }
        setEdge(next === "to" && shown.from === "" ? "from" : next);
    };

    const pick = (day: string) => {
        const d = draft ?? value;
        if (edge === "from" || d.from === "" || day < d.from) {
            // A new start clears the end, which the next click picks.
            setDraft({ from: day, to: "" });
            setEdge("to");
            return;
        }
        finish({ from: d.from, to: day });
    };

    // What the grids tint: the draft, stretched to the hovered day while choosing the end.
    let lo = shown.from;
    let hi = shown.to !== "" ? shown.to : shown.from;
    if (open && edge === "to" && hover !== null && lo !== "" && hover >= lo) hi = hover;

    const today = todayParts();
    const todayDate = toDayDate(today.year, today.month, today.day);
    const status = !open
        ? ""
        : edge === "from"
          ? "Pick the start date"
          : shown.to === ""
            ? "Pick the end date"
            : `${String(dayCount(shown.from, shown.to))} day${dayCount(shown.from, shown.to) === 1 ? "" : "s"} · pick a new end date`;

    const grid = (m: MonthView, nav: "prev" | "next") => (
        <RangeMonth
            month={m}
            lo={lo}
            hi={hi}
            today={todayDate}
            nav={nav}
            onShift={(delta) => {
                setView((v) => shift(v, delta));
            }}
            onPick={pick}
            onHover={edge === "to" ? setHover : undefined}
        />
    );

    return (
        <>
            <div
                data-component="DateRangePicker"
                ref={triggerRef}
                role="group"
                aria-label={ariaLabel}
                className={`daterange ${size === "sm" ? "sm" : ""}`}
            >
                <button
                    type="button"
                    disabled={disabled}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-label="Start date"
                    onClick={() => {
                        focusEdge("from");
                    }}
                    className={open && edge === "from" ? "on" : undefined}
                >
                    <FiCalendar aria-hidden />
                    <span className={shown.from === "" ? "placeholder" : undefined}>
                        {shown.from === "" ? "Start" : formatDayDate(shown.from)}
                    </span>
                </button>
                <span className="arrow">
                    <FiArrowRight aria-hidden />
                </span>
                <button
                    type="button"
                    disabled={disabled}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-label="End date"
                    onClick={() => {
                        focusEdge("to");
                    }}
                    className={open && edge === "to" ? "on" : undefined}
                >
                    <span className={shown.to === "" ? "placeholder" : undefined}>
                        {shown.to === "" ? "End" : formatDayDate(shown.to)}
                    </span>
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    aria-label="Range presets"
                    onClick={() => {
                        if (open) close();
                        else focusEdge("from");
                    }}
                    className="presets"
                >
                    <FiChevronDown aria-hidden />
                </button>
            </div>
            <Popover anchorRef={triggerRef} open={open} onClose={close} maxHeight={480}>
                <div className="daterange-pop">
                    <div className="presets-list">
                        {PRESETS.map((p) => {
                            const r = p.range();
                            const on = r.from === shown.from && r.to === shown.to;
                            return (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => {
                                        finish(r);
                                    }}
                                    className={on ? "on" : undefined}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                    <div>
                        <div className="months">
                            {grid(view, "prev")}
                            {grid(shift(view, 1), "next")}
                        </div>
                        <div className="foot">
                            <span className="hint">{status}</span>
                        </div>
                    </div>
                </div>
            </Popover>
        </>
    );
}

/**
 * One month of the range picker. `nav` says which arrow sits in the header:
 * the left month steps back, the right one forward (on narrow screens only
 * the left month shows, carrying both arrows).
 */
function RangeMonth({
    month,
    lo,
    hi,
    today,
    nav,
    onShift,
    onPick,
    onHover,
}: {
    month: MonthView;
    lo: string;
    hi: string;
    today: string;
    nav: "prev" | "next";
    onShift: (delta: number) => void;
    onPick: (day: string) => void;
    onHover?: (day: string | null) => void;
}) {
    const daysInView = new Date(month.year, month.month, 0).getDate();
    const leadingBlanks = new Date(month.year, month.month - 1, 1).getDay();
    const hasRange = lo !== "" && hi !== "";

    const arrow = (delta: number, className = "") => (
        <button
            type="button"
            aria-label={delta < 0 ? "Previous month" : "Next month"}
            onClick={() => {
                onShift(delta);
            }}
            className={`btn btn-ghost btn-icon btn-sm ${className}`}
        >
            {delta < 0 ? <FiChevronLeft aria-hidden /> : <FiChevronRight aria-hidden />}
        </button>
    );

    return (
        <div data-component="RangeMonth" className={`datepicker ${nav}`}>
            <div className="head">
                {nav === "prev" ? arrow(-1) : <span className="nav-spacer" />}
                <span className="m">
                    {MONTH_NAMES[month.month - 1]} {month.year}
                </span>
                {nav === "next" ? arrow(1) : arrow(1, "only-narrow")}
            </div>
            <div
                role="grid"
                className="grid"
                onMouseLeave={() => {
                    onHover?.(null);
                }}
            >
                {WEEKDAY_LABELS.map((w) => (
                    <div key={w} className="dow">
                        {w}
                    </div>
                ))}
                {Array.from({ length: leadingBlanks }, (_, i) => (
                    <div key={`blank-${String(i)}`} />
                ))}
                {Array.from({ length: daysInView }, (_, i) => i + 1).map((day) => {
                    const dDate = toDayDate(month.year, month.month, day);
                    const isStart = hasRange && dDate === lo;
                    const isEnd = hasRange && dDate === hi;
                    const inRange = hasRange && dDate >= lo && dDate <= hi;
                    const classes = ["d"];
                    if (inRange) classes.push("in-range");
                    if (isStart && lo !== hi) classes.push("range-start");
                    if (isEnd && lo !== hi) classes.push("range-end");
                    if (dDate === today && !isStart && !isEnd) classes.push("today");
                    return (
                        <button
                            key={dDate}
                            type="button"
                            role="gridcell"
                            aria-selected={isStart || isEnd}
                            onClick={() => {
                                onPick(dDate);
                            }}
                            onMouseEnter={() => {
                                onHover?.(dDate);
                            }}
                            className={classes.join(" ")}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
