"use client";

import { useCallback, useRef, useState } from "react";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MONTH_NAMES } from "@/lib/format";
import { Popover, PICKER_TRIGGER_BASE, PICKER_TRIGGER_CLASSES } from "@/components/Popover";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

function toDayDate(year: number, month: number, day: number): string {
    return `${String(year)}-${pad(month)}-${pad(day)}`;
}

/** "YYYY-MM-DD" -> parts, or null when the string is not that shape. */
function parseDayDate(value: string): { year: number; month: number; day: number } | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function todayParts(): { year: number; month: number; day: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** "12 Sep 2026" for the trigger. */
function formatDayDate(value: string): string {
    const parts = parseDayDate(value);
    if (!parts) return "";
    return `${String(parts.day)} ${MONTH_NAMES[parts.month - 1]?.slice(0, 3) ?? "?"} ${String(parts.year)}`;
}

/**
 * Styled replacement for `<input type="date">`: a trigger button plus a
 * month-grid calendar in a popover. Value is a "YYYY-MM-DD" string or "" for
 * empty, exactly like the native element. `min`/`max` (same shape) grey out
 * days outside the range.
 */
export function DatePicker({
    value,
    onChange,
    min,
    max,
    placeholder = "Pick a date…",
    size = "md",
    disabled = false,
    className = "",
    "aria-label": ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    placeholder?: string;
    size?: keyof typeof PICKER_TRIGGER_CLASSES;
    disabled?: boolean;
    className?: string;
    "aria-label"?: string;
}) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const selected = parseDayDate(value);
    // The month on display; seeded from the value (or today) each time the calendar opens.
    const [view, setView] = useState(() => {
        const seed = selected ?? todayParts();
        return { year: seed.year, month: seed.month };
    });

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    const openCalendar = () => {
        const seed = parseDayDate(value) ?? todayParts();
        setView({ year: seed.year, month: seed.month });
        setOpen(true);
    };

    const shiftMonth = (delta: number) => {
        setView((v) => {
            const index = v.year * 12 + (v.month - 1) + delta;
            return { year: Math.floor(index / 12), month: (index % 12) + 1 };
        });
    };

    const daysInView = new Date(view.year, view.month, 0).getDate();
    const leadingBlanks = new Date(view.year, view.month - 1, 1).getDay();
    const today = todayParts();
    const todayDate = toDayDate(today.year, today.month, today.day);

    const pick = (dDate: string) => {
        close();
        if (dDate !== value) onChange(dDate);
    };

    return (
        <>
            <button
                data-component="DatePicker"
                ref={buttonRef}
                type="button"
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => {
                    if (open) close();
                    else openCalendar();
                }}
                className={`${PICKER_TRIGGER_BASE} ${PICKER_TRIGGER_CLASSES[size]} ${className}`}
            >
                <span className={`truncate ${selected ? "" : "text-muted-foreground"}`}>
                    {selected ? formatDayDate(value) : placeholder}
                </span>
                <FiCalendar aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <Popover anchorRef={buttonRef} open={open} onClose={close}>
                <div className="flex items-center justify-between gap-2 px-1 pb-2">
                    <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() => {
                            shiftMonth(-1);
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                        <FiChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium">
                        {MONTH_NAMES[view.month - 1]} {view.year}
                    </span>
                    <button
                        type="button"
                        aria-label="Next month"
                        onClick={() => {
                            shiftMonth(1);
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                        <FiChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <div role="grid" className="grid grid-cols-7 gap-0.5">
                    {WEEKDAY_LABELS.map((w) => (
                        <div key={w} className="w-8 pb-1 text-center text-[10px] font-semibold text-muted-foreground">
                            {w}
                        </div>
                    ))}
                    {Array.from({ length: leadingBlanks }, (_, i) => (
                        <div key={`blank-${String(i)}`} />
                    ))}
                    {Array.from({ length: daysInView }, (_, i) => i + 1).map((day) => {
                        const dDate = toDayDate(view.year, view.month, day);
                        const isSelected = dDate === value;
                        const isToday = dDate === todayDate;
                        const outOfRange = (min !== undefined && dDate < min) || (max !== undefined && dDate > max);
                        return (
                            <button
                                key={dDate}
                                type="button"
                                role="gridcell"
                                aria-selected={isSelected}
                                disabled={outOfRange}
                                onClick={() => {
                                    pick(dDate);
                                }}
                                className={`h-8 w-8 rounded-md text-xs tabular-nums ${
                                    isSelected
                                        ? "bg-primary font-medium text-primary-foreground"
                                        : outOfRange
                                          ? "text-muted-foreground/40"
                                          : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                                } ${isToday && !isSelected ? "ring-1 ring-inset ring-primary/50" : ""}`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                    <button
                        type="button"
                        onClick={() => {
                            pick(todayDate);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                        Today
                    </button>
                    {value !== "" && (
                        <button
                            type="button"
                            onClick={() => {
                                close();
                                onChange("");
                            }}
                            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </Popover>
        </>
    );
}
