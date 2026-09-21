"use client";

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { FiClock } from "react-icons/fi";
import { Popover, PICKER_TRIGGER_CLASSES } from "@/components/Popover";

/** Wheel order matches a clock face: 12 first, then 1–11. Index i is hour (i === 0 ? 12 : i). */
const HOURS = ["12", ...Array.from({ length: 11 }, (_, i) => pad(i + 1))];
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const PERIODS = ["AM", "PM"];
/** Looping wheels render their list this many times and re-centre on the middle copy. */
const LOOP_COPIES = 3;

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

/** "14:05" -> "2:05 pm" for the trigger and the Set button. */
function formatTime(value: string): string {
    const t = parseTime(value);
    if (!t) return "";
    const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
    return `${String(h12)}:${pad(t.minute)} ${t.hour < 12 ? "am" : "pm"}`;
}

/** The three wheel positions behind a 24h time. */
interface Draft {
    hour12: number;
    minute: number;
    pm: boolean;
}

function toDraft(hour: number, minute: number): Draft {
    return { hour12: hour % 12, minute, pm: hour >= 12 };
}

function fromDraft(d: Draft): string {
    return `${pad(d.hour12 + (d.pm ? 12 : 0))}:${pad(d.minute)}`;
}

/**
 * One iOS-style drum: a real scroller with scroll-snap where the row nearest
 * the centre band is the value. Padding equal to half the empty height means
 * row `i` is centred exactly at `scrollTop === i * rowHeight`, so the value
 * is read straight off `scrollTop` and no DOM measuring is needed.
 *
 * A looping wheel holds three copies of its list and is kept on the middle
 * one: once the scroll drifts into the first or last copy it jumps by exactly
 * one copy, which lands on the same row of the middle copy, so the jump is
 * invisible. The jump waits while a click or arrow key is smooth-scrolling —
 * moving the target mid-flight would land the snap one row off.
 */
function Wheel({
    label,
    values,
    index,
    loop = false,
    onChange,
}: {
    label: string;
    values: string[];
    index: number;
    loop?: boolean;
    onChange: (index: number) => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const animating = useRef(false);
    const settleTimer = useRef<number | undefined>(undefined);
    const n = values.length;
    const copies = loop ? LOOP_COPIES : 1;
    const middle = Math.floor(copies / 2);

    // offsetHeight, not getBoundingClientRect: the `.on` row is scaled up by a transform.
    const rowHeight = () => (ref.current?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 34;

    const wrap = () => {
        const el = ref.current;
        if (!el || !loop) return;
        const block = n * rowHeight();
        if (el.scrollTop < block) el.scrollTop += block;
        else if (el.scrollTop >= 2 * block) el.scrollTop -= block;
    };

    const settle = () => {
        window.clearTimeout(settleTimer.current);
        animating.current = false;
        wrap();
    };

    const scrollToRow = (row: number, smooth: boolean) => {
        const el = ref.current;
        if (!el) return;
        if (smooth) {
            animating.current = true;
            // `scrollend` ends the hold; the timer is the fallback for browsers without it.
            window.clearTimeout(settleTimer.current);
            settleTimer.current = window.setTimeout(settle, 700);
        }
        el.scrollTo({ top: row * rowHeight(), behavior: smooth ? "smooth" : "instant" });
    };

    // Land on the selected row of the middle copy when the popover opens.
    const mounted = useRef(false);
    useLayoutEffect(() => {
        if (mounted.current) return;
        mounted.current = true;
        scrollToRow(middle * n + index, false);
    });

    const onScroll = () => {
        const el = ref.current;
        if (!el) return;
        if (!animating.current) wrap();
        const next = ((Math.round(el.scrollTop / rowHeight()) % n) + n) % n;
        if (next !== index) onChange(next);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        const el = ref.current;
        if (!el) return;
        const current = Math.round(el.scrollTop / rowHeight());
        const step = e.key === "ArrowDown" ? 1 : -1;
        scrollToRow(Math.max(0, Math.min(copies * n - 1, current + step)), true);
    };

    return (
        <div
            data-component="Wheel"
            ref={ref}
            role="listbox"
            aria-label={label}
            tabIndex={0}
            className="wheel"
            onScroll={onScroll}
            onScrollEnd={settle}
            onKeyDown={onKeyDown}
        >
            {Array.from({ length: copies }, (_, copy) =>
                values.map((v, i) => {
                    const on = i === index;
                    return (
                        <span
                            key={`${String(copy)}-${v}`}
                            role="option"
                            aria-selected={on && copy === middle}
                            className={on ? "on" : undefined}
                            onClick={() => {
                                scrollToRow(copy * n + i, true);
                            }}
                        >
                            {v}
                        </span>
                    );
                }),
            )}
        </div>
    );
}

/** The wheels plus footer; mounted fresh each time the popover opens so the draft starts from the current value. */
function DrumPanel({ value, onSet, onClear }: { value: string; onSet: (value: string) => void; onClear: () => void }) {
    const [draft, setDraft] = useState<Draft>(() => {
        const t = parseTime(value);
        if (t) return toDraft(t.hour, t.minute);
        const now = new Date();
        return toDraft(now.getHours(), now.getMinutes());
    });
    const next = fromDraft(draft);

    return (
        <div
            data-component="DrumPanel"
            className="timepicker"
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    onSet(next);
                }
            }}
        >
            <div className="drum bare">
                <Wheel
                    label="Hour"
                    values={HOURS}
                    index={draft.hour12}
                    loop
                    onChange={(hour12) => {
                        setDraft((d) => ({ ...d, hour12 }));
                    }}
                />
                <span className="colon">:</span>
                <Wheel
                    label="Minute"
                    values={MINUTES}
                    index={draft.minute}
                    loop
                    onChange={(minute) => {
                        setDraft((d) => ({ ...d, minute }));
                    }}
                />
                <Wheel
                    label="AM or PM"
                    values={PERIODS}
                    index={draft.pm ? 1 : 0}
                    onChange={(i) => {
                        setDraft((d) => ({ ...d, pm: i === 1 }));
                    }}
                />
            </div>
            <div className="flex items-center gap-2 border-t border-line-1 pt-2">
                <button
                    type="button"
                    onClick={() => {
                        const now = new Date();
                        onSet(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
                    }}
                    className="btn btn-ghost btn-sm"
                >
                    Now
                </button>
                {value !== "" && (
                    <button type="button" onClick={onClear} className="btn btn-ghost btn-sm">
                        Clear
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => {
                        onSet(next);
                    }}
                    className="btn btn-primary btn-sm ml-auto"
                >
                    Set {formatTime(next)}
                </button>
            </div>
        </div>
    );
}

/**
 * Styled replacement for `<input type="time">`: a trigger button plus hour,
 * minute and AM/PM drum wheels in a popover. Value is a 24h "HH:MM" string or
 * "" for empty, exactly like the native element. The wheels edit a draft;
 * `Set` (or Enter) commits it, `Now` commits the current time.
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

    const commit = (next: string) => {
        if (next !== value) onChange(next);
        close();
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
                className={`${PICKER_TRIGGER_CLASSES[size]} ${className}`}
            >
                <span className={time ? undefined : "placeholder"}>{time ? formatTime(value) : placeholder}</span>
                <FiClock aria-hidden />
            </button>
            <Popover anchorRef={buttonRef} open={open} onClose={close}>
                <DrumPanel
                    value={value}
                    onSet={commit}
                    onClear={() => {
                        commit("");
                    }}
                />
            </Popover>
        </>
    );
}
