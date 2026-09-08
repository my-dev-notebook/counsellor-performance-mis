"use client";

import { useRouter } from "next/navigation";
import { MONTH_NAMES } from "@/lib/format";

function parseDate(date: string): { year: number; month: number } {
    const [yearStr, monthStr] = date.split("-");
    return { year: Number.parseInt(yearStr ?? "", 10), month: Number.parseInt(monthStr ?? "", 10) };
}

function toDate(year: number, month: number): string {
    return `${String(year)}-${String(month).padStart(2, "0")}`;
}

/** Shared month/year navigation control — pushes `?date=YYYY-MM` onto `basePath`. */
export function MonthPicker({
    date,
    existingMonths,
    basePath,
}: {
    date: string;
    existingMonths: string[];
    basePath: string;
}) {
    const router = useRouter();
    const { year, month } = parseDate(date);

    const navigate = (y: number, m: number) => {
        router.push(`${basePath}?date=${toDate(y, m)}`);
    };

    return (
        <div data-component="MonthPicker" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Month
                <select
                    value={month}
                    onChange={(e) => {
                        navigate(year, Number(e.target.value));
                    }}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                >
                    {MONTH_NAMES.map((name, i) => (
                        <option key={name} value={i + 1}>
                            {name}
                        </option>
                    ))}
                </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Year
                <input
                    type="number"
                    value={year}
                    onChange={(e) => {
                        const y = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(y)) navigate(y, month);
                    }}
                    className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
            </label>
            {existingMonths.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Existing:</span>
                    {existingMonths.map((m) => {
                        const { month: mMonth, year: mYear } = parseDate(m);
                        return (
                            <button
                                key={m}
                                type="button"
                                onClick={() => {
                                    navigate(mYear, mMonth);
                                }}
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    m === date
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground hover:bg-accent"
                                }`}
                            >
                                {MONTH_NAMES[mMonth - 1]?.slice(0, 3)} {mYear}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
