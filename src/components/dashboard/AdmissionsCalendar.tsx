"use client";

import { useMemo, useState } from "react";
import type { AdmissionRow } from "@/db/types";
import { formatInt } from "@/lib/format";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseMonth(monthDate: string): { year: number; month: number } {
    const [yearStr, monthStr] = monthDate.split("-");
    return { year: Number.parseInt(yearStr ?? "", 10), month: Number.parseInt(monthStr ?? "", 10) };
}

function dayDate(monthDate: string, day: number): string {
    return `${monthDate}-${String(day).padStart(2, "0")}`;
}

/** Tint by how busy the day was, relative to the month's best day. */
function cellTone(count: number, max: number): string {
    if (count === 0) return "bg-card text-muted-foreground";
    const ratio = count / max;
    if (ratio >= 0.75) return "bg-success/30 text-foreground";
    if (ratio >= 0.4) return "bg-success/20 text-foreground";
    return "bg-success/10 text-foreground";
}

/**
 * One counsellor's month as a calendar: each day carries its admission count,
 * and clicking a day lists the applicants credited to it. `admissions` are the
 * rows of that one month; days with none are blank.
 */
export function AdmissionsCalendar({ monthDate, admissions }: { monthDate: string; admissions: readonly AdmissionRow[] }) {
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const { year, month } = parseMonth(monthDate);
    const daysInMonth = new Date(year, month, 0).getDate();
    const leadingBlanks = new Date(year, month - 1, 1).getDay();

    const byDay = useMemo(() => {
        const map = new Map<string, AdmissionRow[]>();
        for (const row of admissions) {
            const list = map.get(row.date);
            if (list) list.push(row);
            else map.set(row.date, [row]);
        }
        return map;
    }, [admissions]);

    const maxCount = Math.max(0, ...Array.from(byDay.values(), (rows) => rows.length));
    const selectedRows = selectedDay === null ? [] : (byDay.get(dayDate(monthDate, selectedDay)) ?? []);

    const cells: (number | null)[] = [
        ...Array.from({ length: leadingBlanks }, () => null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div data-component="AdmissionsCalendar" className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Daily admissions</h3>
                    <span className="text-xs text-muted-foreground">{formatInt(admissions.length)} in month</span>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAY_LABELS.map((label) => (
                        <div key={label} className="py-1 text-xs font-medium text-muted-foreground">
                            {label}
                        </div>
                    ))}
                    {cells.map((day, index) => {
                        if (day === null) return <div key={`blank-${String(index)}`} />;
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
                                aria-pressed={isSelected}
                                aria-label={`${dayDate(monthDate, day)}: ${String(count)} admissions`}
                                className={`flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors disabled:cursor-default ${
                                    isSelected ? "border-primary ring-1 ring-primary" : "border-border"
                                } ${cellTone(count, maxCount)} ${count > 0 ? "hover:border-primary/60" : ""}`}
                            >
                                <span className="text-xs leading-none">{day}</span>
                                {count > 0 && <span className="mt-1 text-base leading-none font-semibold">{count}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                    {selectedDay === null ? "Select a day" : `Admissions on ${dayDate(monthDate, selectedDay)}`}
                </h3>
                {selectedDay === null ? (
                    <p className="text-sm text-muted-foreground">Click a day with admissions to see who was admitted.</p>
                ) : (
                    <ul className="divide-y divide-border">
                        {selectedRows.map((row) => (
                            <li key={row.id} className="py-2 text-sm">
                                <p className="font-medium text-foreground">{row.applicantName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {row.applicationNumber} · {row.formName}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
