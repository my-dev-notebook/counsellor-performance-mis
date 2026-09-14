"use client";

import { useEffect, useRef, useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";

export type MenuItem = { label: string; onSelect: () => void; destructive?: boolean; disabled?: boolean };

/** A "⋯" button that opens a small dropdown of row actions. Rendered fixed so the table's overflow can't clip it. */
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const close = () => {
            setOpen(false);
        };
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node;
            if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
            close();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open]);

    const toggle = () => {
        if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }
        setOpen((v) => !v);
    };

    return (
        <div
            data-component="RowMenu"
            className="relative inline-block"
            // Rows open their edit panel on click; the menu must not count as a row click.
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <button
                ref={buttonRef}
                type="button"
                onClick={toggle}
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
                <FiMoreHorizontal className="h-4 w-4" />
            </button>
            {open && (
                <div
                    ref={menuRef}
                    role="menu"
                    style={{ top: position.top, right: position.right }}
                    className="fixed z-50 min-w-40 rounded-md border border-border bg-popover p-1 shadow-lg"
                >
                    {items.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            disabled={item.disabled}
                            onClick={() => {
                                setOpen(false);
                                item.onSelect();
                            }}
                            className={`block w-full rounded px-2.5 py-1.5 text-left text-sm whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent ${
                                item.destructive
                                    ? "text-destructive hover:bg-destructive/10"
                                    : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
