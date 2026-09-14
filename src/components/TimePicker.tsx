"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FiClock } from "react-icons/fi";
import { Popover, PICKER_TRIGGER_BASE, PICKER_TRIGGER_CLASSES } from "@/components/Popover";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad(n: number): string {
    return String(n).padStart(2, "0");
}

/** "HH:MM" -> parts, or null when the string is not that shape. */
function parseTime(value: string): { hour: number; minute: number } | null {
    const match = /^(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour < 24 && minute < 60 ? { hour, minute } : null;
}

/** "14:05" -> "2:05 pm" for the trigger. */
function formatTime(value: string): string {
    const t = parseTime(value);
    if (!t) return "";
    const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
    return `${String(h12)}:${pad(t.minute)} ${t.hour < 12 ? "am" : "pm"}`;
}

function Column({
    label,
    values,
    selected,
    onPick,
}: {
    label: string;
    values: number[];
    selected: number | null;
    onPick: (value: number) => void;
}) {
    const listRef = useRef<HTMLDivElement>(null);

    // Scroll the selected entry into view when the column mounts (the popover opens).
    useEffect(() => {
        if (selected === null) return;
        listRef.current?.children[selected]?.scrollIntoView({ block: "center" });
    }, [selected]);

    return (
        <div data-component="Column" className="flex flex-col">
            <span className="pb-1 text-center text-[10px] font-semibold text-muted-foreground">{label}</span>
            <div ref={listRef} role="listbox" aria-label={label} className="h-48 w-14 overflow-y-auto">
                {values.map((v) => {
                    const isSelected = v === selected;
                    return (
                        <div
                            key={v}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                                onPick(v);
                            }}
                            className={`cursor-pointer rounded-md px-2 py-1 text-center text-sm tabular-nums ${
                                isSelected
                                    ? "bg-primary font-medium text-primary-foreground"
                                    : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                        >
                            {pad(v)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Styled replacement for `<input type="time">`: a trigger button plus hour
 * and minute columns in a popover. Value is a 24h "HH:MM" string or "" for
 * empty, exactly like the native element. Picking an hour before any minute
 * fills the minute with 00 so the value is always complete.
 */
export function TimePicker({
    value,
    onChange,
    placeholder = "Pick a time…",
    size = "md",
    disabled = false,
    className = "",
    "aria-label": ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    size?: keyof typeof PICKER_TRIGGER_CLASSES;
    disabled?: boolean;
    className?: string;
    "aria-label"?: string;
}) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const time = parseTime(value);

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    const pick = (patch: { hour?: number; minute?: number }) => {
        const hour = patch.hour ?? time?.hour ?? 0;
        const minute = patch.minute ?? time?.minute ?? 0;
        const next = `${pad(hour)}:${pad(minute)}`;
        if (next !== value) onChange(next);
        // Picking the minute finishes the entry; picking the hour keeps the popover open for the minute.
        if (patch.minute !== undefined) close();
    };

    return (
        <>
            <button
                data-component="TimePicker"
                ref={buttonRef}
                type="button"
                disabled={disabled}
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => {
                    setOpen((o) => !o);
                }}
                className={`${PICKER_TRIGGER_BASE} ${PICKER_TRIGGER_CLASSES[size]} ${className}`}
            >
                <span className={`truncate ${time ? "" : "text-muted-foreground"}`}>
                    {time ? formatTime(value) : placeholder}
                </span>
                <FiClock aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
            <Popover anchorRef={buttonRef} open={open} onClose={close}>
                <div className="flex gap-1">
                    <Column
                        label="Hour"
                        values={HOURS}
                        selected={time?.hour ?? null}
                        onPick={(hour) => {
                            pick({ hour });
                        }}
                    />
                    <Column
                        label="Min"
                        values={MINUTES}
                        selected={time?.minute ?? null}
                        onPick={(minute) => {
                            pick({ minute });
                        }}
                    />
                </div>
                {value !== "" && (
                    <div className="mt-2 border-t border-border pt-2">
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
                    </div>
                )}
            </Popover>
        </>
    );
}
