"use client";

import { useRouter } from "next/navigation";
import { MONTH_NAMES } from "@/lib/format";

/** Shared month/year navigation control — pushes `?year=&month=` onto `basePath`. */
export function MonthPicker({
  year,
  month,
  existingMonths,
  basePath,
}: {
  year: number;
  month: number;
  existingMonths: { year: number; month: number }[];
  basePath: string;
}) {
  const router = useRouter();

  const navigate = (y: number, m: number) => {
    router.push(`${basePath}?year=${String(y)}&month=${String(m)}`);
  };

  return (
    <div data-component="MonthPicker" className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-sm text-zinc-600">
        Month
        <select
          value={month}
          onChange={(e) => {
            navigate(year, Number(e.target.value));
          }}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-sm text-zinc-600">
        Year
        <input
          type="number"
          value={year}
          onChange={(e) => {
            const y = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(y)) navigate(y, month);
          }}
          className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm"
        />
      </label>
      {existingMonths.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400">Existing:</span>
          {existingMonths.map((m) => (
            <button
              key={`${String(m.year)}-${String(m.month)}`}
              type="button"
              onClick={() => {
                navigate(m.year, m.month);
              }}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                m.year === year && m.month === month
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {MONTH_NAMES[m.month - 1]?.slice(0, 3)} {m.year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
