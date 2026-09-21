"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MONTH_NAMES, formatMonthLabel } from "@/lib/format";
import { Popover } from "@/components/Popover";

function parseDate(date: string): { year: number; month: number } {
    const [yearStr, monthStr] = date.split("-");
    return { year: Number.parseInt(yearStr ?? "", 10), month: Number.parseInt(monthStr ?? "", 10) };
}

function toDate(year: number, month: number): string {
    return `${String(year)}-${String(month).padStart(2, "0")}`;
}

/**
 * Shared month navigation control — a trigger that opens a year-by-year month grid. Months that already have data
 * are marked with a dot. Picking a month pushes `?date=YYYY-MM` onto `basePath`, keeping any other query params.
 */
export function MonthPicker({
    date,
    existingMonths,
    basePath,
    label = "Month",
}: {
    date: string;
    existingMonths: string[];
    basePath: string;
    /** Accessible name for the trigger. */
    label?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { year, month } = parseDate(date);
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(year);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const existing = new Set(existingMonths);

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    const navigate = (y: number, m: number) => {
        close();
        const params = new URLSearchParams(searchParams);
        params.set("date", toDate(y, m));
        router.push(`${basePath}?${params.toString()}`);
    };

    return (
        <div data-component="MonthPicker" className="inline-flex">
            <button
                ref={buttonRef}
                type="button"
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => {
                    if (open) close();
                    else {
                        setViewYear(year);
                        setOpen(true);
                    }
                }}
                className="select-trigger w-auto min-w-44"
            >
                <span>{formatMonthLabel(date)}</span>
                <FiCalendar aria-hidden />
            </button>
            <Popover anchorRef={buttonRef} open={open} onClose={close}>
                <div className="datepicker w-auto">
                    <div className="head">
                        <button
                            type="button"
                            aria-label="Previous year"
                            onClick={() => {
                                setViewYear((y) => y - 1);
                            }}
                            className="btn btn-ghost btn-icon btn-sm"
                        >
                            <FiChevronLeft aria-hidden />
                        </button>
                        <span className="m t-num">{viewYear}</span>
                        <button
                            type="button"
                            aria-label="Next year"
                            onClick={() => {
                                setViewYear((y) => y + 1);
                            }}
                            className="btn btn-ghost btn-icon btn-sm"
                        >
                            <FiChevronRight aria-hidden />
                        </button>
                    </div>
                    <div className="month-grid">
                        {MONTH_NAMES.map((name, i) => {
                            const m = i + 1;
                            const key = toDate(viewYear, m);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    aria-selected={key === date}
                                    className={existing.has(key) ? "has-data" : undefined}
                                    onClick={() => {
                                        navigate(viewYear, m);
                                    }}
                                >
                                    {name.slice(0, 3)}
                                </button>
                            );
                        })}
                    </div>
                    <div className="foot">
                        <span className="legend">
                            <span>
                                <i style={{ background: "var(--accent)", borderRadius: "50%", width: 5, height: 5 }} />
                                has data
                            </span>
                        </span>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                const now = new Date();
                                navigate(now.getFullYear(), now.getMonth() + 1);
                            }}
                        >
                            This month
                        </button>
                    </div>
                </div>
            </Popover>
        </div>
    );
}
