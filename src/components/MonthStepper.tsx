"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { formatMonthLabel } from "@/lib/format";
import { currentMonthDate } from "@/schemas/dates";

function shiftMonth(date: string, delta: number): string {
    const [yearStr, monthStr] = date.split("-");
    const index = Number.parseInt(yearStr ?? "", 10) * 12 + Number.parseInt(monthStr ?? "", 10) - 1 + delta;
    return `${String(Math.floor(index / 12))}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * Compact previous / next month control for card headers — `MonthPicker`'s quick-step sibling. Pushes
 * `?date=YYYY-MM` onto the current path, keeping any other query params. Stepping past the current month is
 * disabled, since no data can exist there yet.
 */
export function MonthStepper({ date }: { date: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const next = shiftMonth(date, 1);

    const navigate = (target: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("date", target);
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <div data-component="MonthStepper" className="row gap-1">
            <button
                type="button"
                aria-label="Previous month"
                onClick={() => {
                    navigate(shiftMonth(date, -1));
                }}
                className="btn btn-ghost btn-icon btn-sm"
            >
                <FiChevronLeft aria-hidden />
            </button>
            <span className="t-sm t-num min-w-28 text-center font-medium">{formatMonthLabel(date)}</span>
            <button
                type="button"
                aria-label="Next month"
                disabled={next > currentMonthDate()}
                onClick={() => {
                    navigate(next);
                }}
                className="btn btn-ghost btn-icon btn-sm"
            >
                <FiChevronRight aria-hidden />
            </button>
        </div>
    );
}
