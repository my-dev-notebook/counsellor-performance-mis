"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

interface Position {
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
}

const GAP = 4;

/**
 * Anchored popover shared by the picker controls (`DatePicker`, `TimePicker`):
 * rendered in a portal under `document.body`, positioned below the anchor
 * (or above when there is more room there), and closed on outside click,
 * Escape, resize and any scroll outside the panel. `Select` keeps its own
 * copy because its listbox needs the anchor's width and keyboard focus rules.
 */
export function Popover({
    anchorRef,
    open,
    onClose,
    maxHeight = 320,
    children,
}: {
    anchorRef: RefObject<HTMLElement | null>;
    open: boolean;
    onClose: () => void;
    maxHeight?: number;
    children: ReactNode;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<Position>({ left: 0, maxHeight });

    useLayoutEffect(() => {
        if (!open) return;
        const anchor = anchorRef.current;
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - GAP;
        const spaceAbove = rect.top - GAP;
        const flipUp = spaceBelow < maxHeight && spaceAbove > spaceBelow;
        const width = panelRef.current?.offsetWidth ?? 0;
        setPosition({
            ...(flipUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
            left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
            maxHeight: Math.min(maxHeight, flipUp ? spaceAbove : spaceBelow),
        });
    }, [open, anchorRef, maxHeight]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
            onClose();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        const onScroll = (e: Event) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", onClose);
        window.addEventListener("scroll", onScroll, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", onClose);
            window.removeEventListener("scroll", onScroll, true);
        };
    }, [open, onClose, anchorRef]);

    if (!open) return null;
    return createPortal(
        <div
            data-component="Popover"
            ref={panelRef}
            style={position}
            className="fixed z-50 overflow-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
        >
            {children}
        </div>,
        document.body,
    );
}

/** Shared trigger look for the picker controls, matching `Select`'s button. */
export const PICKER_TRIGGER_CLASSES = {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2 text-sm",
} as const;

export const PICKER_TRIGGER_BASE =
    "inline-flex items-center justify-between gap-2 rounded-md border border-input bg-background text-left text-foreground focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";
