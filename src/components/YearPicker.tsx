"use client";

import { useRouter } from "next/navigation";

/** `MonthPicker`'s yearly sibling — pushes `?year=YYYY` onto `basePath`. */
export function YearPicker({
    year,
    existingYears,
    basePath,
}: {
    year: string;
    existingYears: string[];
    basePath: string;
}) {
    const router = useRouter();

    const navigate = (y: number) => {
        router.push(`${basePath}?year=${String(y)}`);
    };

    return (
        <div data-component="YearPicker" className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                Year
                <input
                    type="number"
                    value={Number.parseInt(year, 10)}
                    onChange={(e) => {
                        const y = Number.parseInt(e.target.value, 10);
                        if (Number.isFinite(y) && y >= 1000 && y <= 9999) navigate(y);
                    }}
                    className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                />
            </label>
            {existingYears.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Existing:</span>
                    {existingYears.map((y) => (
                        <button
                            key={y}
                            type="button"
                            onClick={() => {
                                navigate(Number.parseInt(y, 10));
                            }}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                y === year
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                        >
                            {y}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
