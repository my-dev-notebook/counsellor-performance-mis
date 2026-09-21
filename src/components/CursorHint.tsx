"use client";

import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";

/** How far above (or, when flipped, below) the pointer the bubble sits. */
const GAP = 20;
/** Minimum distance kept from the viewport edges. */
const EDGE = 8;

export interface Hint<K extends string> {
    key: K;
    x: number;
    y: number;
}

/**
 * Pointer-following hover state for a control with several hover zones (the gauge's two arcs, a meter's
 * filled and empty parts). `follow(key)` gives a mouse handler that records the zone and pointer position;
 * `leave` clears it.
 */
export function useCursorHint<K extends string>() {
    const [hint, setHint] = useState<Hint<K> | null>(null);
    const follow = (key: K) => (e: MouseEvent) => {
        setHint({ key, x: e.clientX, y: e.clientY });
    };
    const leave = () => {
        setHint(null);
    };
    return { hint, follow, leave };
}

/**
 * The bubble for `useCursorHint`. Rendered in a portal so a card's `overflow:hidden` never clips it, and
 * measured after render so it stays inside the viewport: centred on the pointer but pushed in from the
 * sides, above the pointer but flipped below when there is no room on top.
 */
export function CursorHint({ x, y, text }: { x: number; y: number; text: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const { offsetWidth: w, offsetHeight: h } = el;
        const left = Math.max(EDGE, Math.min(x - w / 2, window.innerWidth - w - EDGE));
        let top = y - GAP - h;
        if (top < EDGE) top = y + GAP;
        top = Math.min(top, window.innerHeight - h - EDGE);
        setPos({ top, left });
    }, [x, y, text]);

    return createPortal(
        <div
            data-component="CursorHint"
            ref={ref}
            role="tooltip"
            // Hidden until measured — the layout effect runs before paint, so this never shows.
            style={pos ?? { top: 0, left: 0, visibility: "hidden" }}
            className="tooltip pointer-events-none fixed z-50 whitespace-nowrap"
        >
            {text}
        </div>,
        document.body,
    );
}
