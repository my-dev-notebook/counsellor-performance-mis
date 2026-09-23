"use client";

import { useMemo, useState } from "react";
import type { SuccessfulApplicationRow } from "@/db/types";
import { formatInt } from "@/lib/format";
import { MonthStepper } from "@/components/MonthStepper";
import { cellTone } from "@/lib/successful-applications/calendar-tone";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseMonth(monthDate: string): { year: number; month: number } {
    const [yearStr, monthStr] = monthDate.split("-");
    return { year: Number.parseInt(yearStr ?? "", 10), month: Number.parseInt(monthStr ?? "", 10) };
}

function dayDate(monthDate: string, day: number): string {
    return `${monthDate}-${String(day).padStart(2, "0")}`;
}

/**
 * One counsellor's month as a calendar heatmap: each day carries its successful application
 * count, and clicking a day lists the applicants credited to it. `successfulApplications`
 * are the rows of that one month; days with none are blank.
 */
export function SuccessfulApplicationsCalendar({
    monthDate,
    successfulApplications,
}: {
    monthDate: string;
    successfulApplications: readonly SuccessfulApplicationRow[];
}) {
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const { year, month } = parseMonth(monthDate);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = new Date(year, month - 1, 1).getDay();

    const byDay = useMemo(() => {
        const map = new Map<string, SuccessfulApplicationRow[]>();
        for (const row of successfulApplications) {
            const list = map.get(row.date);
            if (list) list.push(row);
            else map.set(row.date, [row]);
        }
        return map;
    }, [successfulApplications]);

    const maxCount = Math.max(0, ...Array.from(byDay.values(), (rows) => rows.length));
    const selectedRows = selectedDay === null ? [] : (byDay.get(dayDate(monthDate, selectedDay)) ?? []);

    const cells: (number | null)[] = [
        ...Array.from({ length: leadingBlanks }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div data-component="SuccessfulApplicationsCalendar" className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="card">
                <div className="card-head">
                    <h3 className="card-title">Daily applications</h3>
                    <div className="row gap-3">
                        <span className="card-meta">{formatInt(successfulApplications.length)} in month</span>
                        <MonthStepper date={monthDate} />
                    </div>
                </div>
                <div className="card-pad">
                    <div className="cal">
                        {WEEKDAY_LABELS.map((label) => (
                            <div key={label} className="dow">
                                {label}
                            </div>
                        ))}
                        {cells.map((day, index) => {
                            if (day === null) return <div key={`blank-${String(index)}`} className="day blank" />;
                            const count = byDay.get(dayDate(monthDate, day))?.length ?? 0;
                            const isSelected = day === selectedDay;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={count === 0}
                                    onClick={() => {
                                        setSelectedDay(isSelected ? null : day);
                                    }}
                                    aria-selected={isSelected}
                                    aria-label={`${dayDate(monthDate, day)}: ${String(count)} applications`}
                                    className={`day ${cellTone(count, maxCount)} ${count === 0 ? "cursor-default" : ""}`}
                                >
                                    <span className="n">{day}</span>
                                    {count > 0 && <span className="c">{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="card">
                <div className="card-head">
                    <h3 className="card-title">
                        {selectedDay === null ? "Select a day" : `Applications on ${dayDate(monthDate, selectedDay)}`}
                    </h3>
                </div>
                <div className="card-pad">
                    {selectedDay === null ? (
                        <p className="t-sm ink-3">Click a day with applications to see who applied.</p>
                    ) : (
                        <ul className="divide-y divide-line-1">
                            {selectedRows.map((row) => (
                                <li key={row.id} className="py-2">
                                    <p className="t-sm font-medium">{row.applicantName}</p>
                                    <p className="t-xs ink-3">
                                        {row.applicationNumber} · {row.formName}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
