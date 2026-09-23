"use client";

import { useRouter } from "next/navigation";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { formatSessionSpan } from "@/schemas/dates";

/**
 * `MonthPicker`'s yearly sibling — a session stepper that pushes `?year=YYYY` onto `basePath`. The year is a
 * SESSION year (Oct → Sep, named after the calendar year it ends in), so the control spells out the calendar span
 * under the session name.
 */
export function YearPicker({
    year,
    basePath,
}: {
    year: string;
    basePath: string;
}) {
    const router = useRouter();
    const current = Number.parseInt(year, 10);

    const navigate = (y: number) => {
        if (y >= 1000 && y <= 9999) router.push(`${basePath}?year=${String(y)}`);
    };

    return (
        <div data-component="YearPicker" className="flex flex-wrap items-center gap-3">
            <div className="row gap-2">
                <button
                    type="button"
                    aria-label="Previous session"
                    onClick={() => {
                        navigate(current - 1);
                    }}
                    className="btn btn-secondary btn-icon btn-sm"
                >
                    <FiChevronLeft aria-hidden />
                </button>
                <div className="min-w-40 text-center">
                    <div className="t-sm font-semibold">
                        Session {String(current - 1)}–{year.slice(-2)}
                    </div>
                    <div className="t-xs ink-3">{formatSessionSpan(year)}</div>
                </div>
                <button
                    type="button"
                    aria-label="Next session"
                    onClick={() => {
                        navigate(current + 1);
                    }}
                    className="btn btn-secondary btn-icon btn-sm"
                >
                    <FiChevronRight aria-hidden />
                </button>
            </div>
        </div>
    );
}
