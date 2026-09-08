"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdmissionRecord, CounsellorRow, DailyAdmission } from "@/db/types";
import { MONTH_NAMES } from "@/lib/format";
import { saveDailyAdmissionAction } from "@/app/entry/actions";

/** Days in the "YYYY-MM" month, via vanilla Date (day 0 of next month = last day of this month). */
function daysInMonth(date: string): number {
    const [yearStr, monthStr] = date.split("-");
    const year = Number.parseInt(yearStr ?? "", 10);
    const month = Number.parseInt(monthStr ?? "", 10);
    return new Date(year, month, 0).getDate();
}

function dayDate(monthDate: string, day: number): string {
    return `${monthDate}-${String(day).padStart(2, "0")}`;
}

/** 0 (Sun) .. 6 (Sat) for the 1st of the "YYYY-MM" month — leading blanks in the calendar grid. */
function firstWeekday(date: string): number {
    const [yearStr, monthStr] = date.split("-");
    const year = Number.parseInt(yearStr ?? "", 10);
    const month = Number.parseInt(monthStr ?? "", 10);
    return new Date(year, month - 1, 1).getDay();
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseMetadata(metadata: string | null): AdmissionRecord[] {
    if (!metadata) return [];
    try {
        const parsed: unknown = JSON.parse(metadata);
        return Array.isArray(parsed) ? (parsed as AdmissionRecord[]) : [];
    } catch {
        return [];
    }
}

function parseMonthDate(date: string): { year: number; month: number } {
    const [yearStr, monthStr] = date.split("-");
    return { year: Number.parseInt(yearStr ?? "", 10), month: Number.parseInt(monthStr ?? "", 10) };
}

function toMonthDate(year: number, month: number): string {
    return `${String(year)}-${String(month).padStart(2, "0")}`;
}

function CounsellorPicker({ counsellors, date }: { counsellors: CounsellorRow[]; date: string }) {
    const router = useRouter();
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (q === "") return counsellors;
        return counsellors.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.teamName.toLowerCase().includes(q) ||
                (c.agencyName?.toLowerCase().includes(q) ?? false),
        );
    }, [counsellors, search]);

    return (
        <div data-component="CounsellorPicker" className="space-y-3">
            <input
                placeholder="Search by name, team, agency…"
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                }}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground sm:w-80"
            />
            <div className="overflow-hidden rounded-lg border border-border bg-card">
                <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            {["Counsellor", "Team", "Agency"].map((h) => (
                                <th
                                    key={h}
                                    className="px-3 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filtered.map((c) => (
                            <tr
                                key={c.id}
                                onClick={() => {
                                    router.push(`/entry/daily?userId=${String(c.id)}&date=${date}`);
                                }}
                                className="cursor-pointer hover:bg-accent/50"
                            >
                                <td className="px-3 py-2 font-medium text-foreground">{c.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{c.teamName}</td>
                                <td className="px-3 py-2 text-muted-foreground">{c.agencyName ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MonthNav({ date, userId }: { date: string; userId: number }) {
    const router = useRouter();
    const { year, month } = parseMonthDate(date);

    const navigate = (y: number, m: number) => {
        router.push(`/entry/daily?userId=${String(userId)}&date=${toMonthDate(y, m)}`);
    };

    return (
        <div data-component="MonthNav" className="flex flex-wrap items-center gap-3">
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
        </div>
    );
}

function CalendarGrid({
    date,
    counts,
    selectedDate,
    onSelect,
}: {
    date: string;
    counts: Map<string, number>;
    selectedDate: string | null;
    onSelect: (dDate: string) => void;
}) {
    const days = Array.from({ length: daysInMonth(date) }, (_, i) => i + 1);
    const leadingBlanks = Array.from({ length: firstWeekday(date) }, (_, i) => i);

    return (
        <div data-component="CalendarGrid" className="w-fit rounded-lg border border-border bg-card p-2">
            <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((w) => (
                    <div key={w} className="w-9 pb-0.5 text-center text-[10px] font-semibold text-muted-foreground">
                        {w}
                    </div>
                ))}
                {leadingBlanks.map((i) => (
                    <div key={`blank-${String(i)}`} />
                ))}
                {days.map((day) => {
                    const dDate = dayDate(date, day);
                    const count = counts.get(dDate) ?? 0;
                    const selected = dDate === selectedDate;
                    return (
                        <button
                            key={dDate}
                            type="button"
                            onClick={() => {
                                onSelect(dDate);
                            }}
                            className={`flex h-9 w-9 flex-col items-center justify-center rounded-md border text-xs leading-none ${
                                selected
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border text-foreground hover:bg-accent/50"
                            }`}
                        >
                            <span>{day}</span>
                            <span
                                className={`mt-0.5 text-[9px] ${count > 0 ? "text-primary" : "text-muted-foreground"}`}
                            >
                                {count > 0 ? count : "—"}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function isEmptyRecord(r: AdmissionRecord): boolean {
    return r.leadId === "" && r.leadName === "" && r.leadEmail === "";
}

const BLANK_RECORD: AdmissionRecord = { leadId: "", leadName: "", leadEmail: "" };

/** Guarantees exactly one trailing blank row, so the table always has a place to type a new admission. */
function withTrailingBlank(records: AdmissionRecord[]): AdmissionRecord[] {
    if (records.length === 0 || !isEmptyRecord(records[records.length - 1])) {
        return [...records, { ...BLANK_RECORD }];
    }
    return records;
}

function DayEditor({
    userId,
    date,
    initialRecords,
    onSaved,
}: {
    userId: number;
    date: string;
    initialRecords: AdmissionRecord[];
    onSaved: (dDate: string, records: AdmissionRecord[]) => void;
}) {
    const [records, setRecords] = useState<AdmissionRecord[]>(() => withTrailingBlank(initialRecords));
    const [past, setPast] = useState<AdmissionRecord[][]>([]);
    const [future, setFuture] = useState<AdmissionRecord[][]>([]);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(true);

    const commit = (next: AdmissionRecord[]) => {
        setPast((p) => [...p, records]);
        setFuture([]);
        setRecords(next);
        setSaved(false);
    };

    const undo = () => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        setPast((p) => p.slice(0, -1));
        setFuture((f) => [records, ...f]);
        setRecords(previous);
        setSaved(false);
    };

    const redo = () => {
        if (future.length === 0) return;
        const next = future[0];
        setFuture((f) => f.slice(1));
        setPast((p) => [...p, records]);
        setRecords(next);
        setSaved(false);
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            if (e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [records, past, future]);

    const updateRecord = (index: number, field: keyof AdmissionRecord, value: string) => {
        const next = withTrailingBlank(records.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
        commit(next);
    };

    const removeRecord = (index: number) => {
        commit(withTrailingBlank(records.filter((_, i) => i !== index)));
    };

    const save = () => {
        setError(null);
        const toSave = records.filter((r) => !isEmptyRecord(r));
        startTransition(async () => {
            try {
                await saveDailyAdmissionAction(userId, date, toSave);
                setSaved(true);
                onSaved(date, toSave);
            } catch {
                setError("Failed to save. Check the values and try again.");
            }
        });
    };

    const day = Number.parseInt(date.split("-")[2] ?? "0", 10);
    const filledCount = records.filter((r) => !isEmptyRecord(r)).length;

    return (
        <div data-component="DayEditor" className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                    Day {day} — {filledCount} admission{filledCount === 1 ? "" : "s"}
                </p>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        disabled={past.length === 0}
                        onClick={undo}
                        title="Undo (Ctrl+Z)"
                        className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                    >
                        Undo
                    </button>
                    <button
                        type="button"
                        disabled={future.length === 0}
                        onClick={redo}
                        title="Redo (Ctrl+Y)"
                        className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-40"
                    >
                        Redo
                    </button>
                </div>
            </div>
            <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                    <thead>
                        <tr>
                            {["Lead user ID", "Lead name", "Lead email", ""].map((h) => (
                                <th
                                    key={h}
                                    className="px-2 py-1.5 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {records.map((record, index) => {
                            const blank = isEmptyRecord(record);
                            return (
                                <tr key={index}>
                                    <td className="px-2 py-1">
                                        <input
                                            value={record.leadId}
                                            placeholder="Lead user ID"
                                            onChange={(e) => {
                                                updateRecord(index, "leadId", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            value={record.leadName}
                                            placeholder="Lead name"
                                            onChange={(e) => {
                                                updateRecord(index, "leadName", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        <input
                                            type="email"
                                            value={record.leadEmail}
                                            placeholder="Lead email"
                                            onChange={(e) => {
                                                updateRecord(index, "leadEmail", e.target.value);
                                            }}
                                            className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                    </td>
                                    <td className="px-2 py-1">
                                        {!blank && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    removeRecord(index);
                                                }}
                                                title="Delete row"
                                                className="rounded-md border border-input px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    disabled={pending}
                    onClick={save}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                    {pending ? "Saving…" : "Save day"}
                </button>
                {!saved && !pending && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
                {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
        </div>
    );
}

export function DailyEntryView({
    date,
    counsellors,
    selectedUserId,
    counsellorName,
    admissions,
}: {
    date: string;
    counsellors: CounsellorRow[];
    selectedUserId: number | null;
    counsellorName: string | null;
    admissions: DailyAdmission[];
}) {
    const router = useRouter();
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [recordsByDate, setRecordsByDate] = useState<Map<string, AdmissionRecord[]>>(
        new Map(admissions.map((a) => [a.date, parseMetadata(a.metadata)])),
    );

    if (selectedUserId === null) {
        return <CounsellorPicker counsellors={counsellors} date={date} />;
    }

    const counts = new Map(Array.from(recordsByDate.entries()).map(([d, records]) => [d, records.length]));

    const handleSaved = (dDate: string, records: AdmissionRecord[]) => {
        setRecordsByDate((prev) => new Map(prev).set(dDate, records));
    };

    return (
        <div data-component="DailyEntryView" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <button
                        type="button"
                        onClick={() => {
                            router.push(`/entry/daily?date=${date}`);
                        }}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                        ← Back to counsellor list
                    </button>
                    <h2 className="mt-1 text-base font-semibold text-foreground">{counsellorName}</h2>
                </div>
                <MonthNav date={date} userId={selectedUserId} />
            </div>
            <CalendarGrid date={date} counts={counts} selectedDate={selectedDate} onSelect={setSelectedDate} />
            {selectedDate && (
                <DayEditor
                    key={selectedDate}
                    userId={selectedUserId}
                    date={selectedDate}
                    initialRecords={recordsByDate.get(selectedDate) ?? []}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
