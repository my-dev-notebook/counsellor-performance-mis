"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Delay before showing, so a pointer passing over a row of buttons doesn't flash tooltips. */
const SHOW_DELAY_MS = 300;
const GAP = 6;

type Placement = { top: number; left: number; side: "top" | "bottom" };

/**
 * Styled replacement for the native `title` hover hint. Wraps a single element; the bubble appears above it
 * on hover or keyboard focus (below when there's no room above) and is rendered in a portal so it's never clipped.
 */
export function Tooltip({ content, children }: { content: string; children: ReactNode }) {
    const [placement, setPlacement] = useState<Placement | null>(null);
    const anchorRef = useRef<HTMLSpanElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const show = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            const rect = anchorRef.current?.getBoundingClientRect();
            if (!rect) return;
            const side = rect.top - GAP > 40 ? "top" : "bottom";
            setPlacement({
                top: side === "top" ? rect.top - GAP : rect.bottom + GAP,
                left: rect.left + rect.width / 2,
                side,
            });
        }, SHOW_DELAY_MS);
    };

    const hide = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
        setPlacement(null);
    };

    useEffect(() => {
        if (!placement) return;
        const dismiss = () => {
            setPlacement(null);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") dismiss();
        };
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("scroll", dismiss, true);
        window.addEventListener("resize", dismiss);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("scroll", dismiss, true);
            window.removeEventListener("resize", dismiss);
        };
    }, [placement]);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    return (
        <span
            data-component="Tooltip"
            ref={anchorRef}
            className="inline-flex"
            onMouseEnter={show}
            onMouseLeave={hide}
            onFocus={show}
            onBlur={hide}
            // Clicking the wrapped control dismisses the hint, like native tooltips do.
            onMouseDown={hide}
        >
            {children}
            {placement &&
                createPortal(
                    <div
                        role="tooltip"
                        style={{
                            top: placement.top,
                            left: placement.left,
                            transform: placement.side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
                        }}
                        className="tooltip pointer-events-none fixed z-50"
                    >
                        {content}
                    </div>,
                    document.body,
                )}
        </span>
    );
}
