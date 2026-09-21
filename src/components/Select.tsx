"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export type SelectOption = { value: string; label: string };

type MenuPosition = {
    top?: number;
    bottom?: number;
    left: number;
    minWidth: number;
    maxWidth: number;
    maxHeight: number;
};

/** Space between the trigger and the menu, and the tallest the menu will grow before scrolling. */
const MENU_GAP = 4;
const MENU_MAX_HEIGHT = 288;
/** The menu never grows wider than this even for long labels; the label truncates instead. */
const MENU_MAX_WIDTH = 360;
const TYPEAHEAD_RESET_MS = 500;

const SIZE_CLASSES = {
    sm: "select-trigger sm",
    md: "select-trigger",
} as const;

/**
 * Styled replacement for a native `<select>`: a trigger button plus a listbox popover rendered in a portal
 * (so it matches the app's popover styling and can't be clipped by overflow containers).
 * Values are strings, like the native element — callers convert numeric ids themselves.
 */
export function Select({
    value,
    onChange,
    options,
    placeholder = "Select…",
    size = "md",
    disabled = false,
    className = "",
    "aria-label": ariaLabel,
}: {
    value: string;
    onChange: (value: string) => void;
    options: readonly SelectOption[];
    placeholder?: string;
    size?: keyof typeof SIZE_CLASSES;
    disabled?: boolean;
    className?: string;
    "aria-label"?: string;
}) {
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const [position, setPosition] = useState<MenuPosition>({
        left: 0,
        minWidth: 0,
        maxWidth: MENU_MAX_WIDTH,
        maxHeight: MENU_MAX_HEIGHT,
    });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const typeahead = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
        buffer: "",
        timer: null,
    });
    const listboxId = useId();

    const selectedIndex = options.findIndex((option) => option.value === value);
    const selected = selectedIndex === -1 ? undefined : options[selectedIndex];

    const openMenu = () => {
        const button = buttonRef.current;
        if (!button || options.length === 0) return;
        const rect = button.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
        const spaceAbove = rect.top - MENU_GAP;
        const flipUp = spaceBelow < MENU_MAX_HEIGHT && spaceAbove > spaceBelow;
        // The menu is at least as wide as its trigger and otherwise sized to its content (`width: max-content`),
        // capped so a long label can't push it off-screen.
        const maxWidth = Math.max(rect.width, Math.min(MENU_MAX_WIDTH, window.innerWidth - rect.left - 8));
        setPosition({
            ...(flipUp ? { bottom: window.innerHeight - rect.top + MENU_GAP } : { top: rect.bottom + MENU_GAP }),
            left: rect.left,
            minWidth: rect.width,
            maxWidth,
            maxHeight: Math.min(MENU_MAX_HEIGHT, flipUp ? spaceAbove : spaceBelow),
        });
        setHighlighted(Math.max(0, selectedIndex));
        setOpen(true);
    };

    const closeMenu = () => {
        setOpen(false);
    };

    const commit = (index: number) => {
        const option = options[index];
        closeMenu();
        if (option && option.value !== value) onChange(option.value);
    };

    useEffect(() => {
        if (!open) return;
        const close = () => {
            setOpen(false);
        };
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
            close();
        };
        // Scrolling inside the listbox is fine; scrolling anything else would leave the menu detached from its trigger.
        const onScroll = (e: Event) => {
            if (listRef.current?.contains(e.target as Node)) return;
            close();
        };
        document.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", onScroll, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", onScroll, true);
        };
    }, [open]);

    // Keep the highlighted option visible while navigating with the keyboard.
    useEffect(() => {
        if (!open) return;
        listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
    }, [open, highlighted]);

    const moveHighlight = (delta: number) => {
        setHighlighted((current) => Math.min(options.length - 1, Math.max(0, current + delta)));
    };

    const handleTypeahead = (char: string) => {
        const state = typeahead.current;
        if (state.timer) clearTimeout(state.timer);
        state.buffer += char.toLowerCase();
        state.timer = setTimeout(() => {
            state.buffer = "";
        }, TYPEAHEAD_RESET_MS);

        // Search after the current highlight first so repeated presses cycle through matches.
        const start = state.buffer.length === 1 ? highlighted + 1 : highlighted;
        const ordered = [...options.keys()].map((i) => (start + i) % options.length);
        const match = ordered.find((i) => options[i]?.label.toLowerCase().startsWith(state.buffer));
        if (match !== undefined) setHighlighted(match);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
                e.preventDefault();
                openMenu();
            }
            return;
        }
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                moveHighlight(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                moveHighlight(-1);
                break;
            case "Home":
                e.preventDefault();
                setHighlighted(0);
                break;
            case "End":
                e.preventDefault();
                setHighlighted(options.length - 1);
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                commit(highlighted);
                break;
            case "Escape":
                e.preventDefault();
                closeMenu();
                break;
            case "Tab":
                closeMenu();
                break;
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    handleTypeahead(e.key);
                }
        }
    };

    const optionId = (index: number) => `${listboxId}-${String(index)}`;

    return (
        <>
            <button
                data-component="Select"
                ref={buttonRef}
                type="button"
                disabled={disabled}
                role="combobox"
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                aria-activedescendant={open ? optionId(highlighted) : undefined}
                onClick={() => {
                    if (open) closeMenu();
                    else openMenu();
                }}
                onKeyDown={onKeyDown}
                className={`${SIZE_CLASSES[size]} ${className}`}
            >
                <span className={selected ? undefined : "placeholder"}>{selected?.label ?? placeholder}</span>
                <FiChevronDown aria-hidden />
            </button>
            {open &&
                createPortal(
                    <div
                        ref={listRef}
                        id={listboxId}
                        role="listbox"
                        style={{ ...position, width: "max-content" }}
                        // Keep focus (and keyboard handling) on the trigger while clicking options.
                        onMouseDown={(e) => {
                            e.preventDefault();
                        }}
                        className="popover menu fixed z-50 overflow-y-auto"
                    >
                        {options.map((option, index) => {
                            const isSelected = index === selectedIndex;
                            const isHighlighted = index === highlighted;
                            return (
                                <div
                                    key={option.value}
                                    id={optionId(index)}
                                    role="option"
                                    aria-selected={isSelected}
                                    data-active={isHighlighted ? "" : undefined}
                                    onMouseEnter={() => {
                                        setHighlighted(index);
                                    }}
                                    onClick={() => {
                                        commit(index);
                                    }}
                                    className="menu-item whitespace-nowrap"
                                >
                                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                                    {isSelected && <FiCheck aria-hidden className="shrink-0" />}
                                </div>
                            );
                        })}
                    </div>,
                    document.body,
                )}
        </>
    );
}
