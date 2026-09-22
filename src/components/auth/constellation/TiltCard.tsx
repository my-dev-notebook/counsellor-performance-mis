"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The sign-in card: tilts a few degrees toward the pointer and moves the spotlight border (`--mx`/`--my`).
 * Writes are batched to one per frame; touch devices and reduced motion get a static card.
 */
export function TiltCard({ className, children }: { className: string; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (
            !matchMedia("(hover: hover) and (pointer: fine)").matches ||
            matchMedia("(prefers-reduced-motion: reduce)").matches
        )
            return;
        let raf = 0;
        let x = 0.5;
        let y = 0.5;
        const apply = () => {
            raf = 0;
            el.style.setProperty("--mx", (x * 100).toFixed(2) + "%");
            el.style.setProperty("--my", (y * 100).toFixed(2) + "%");
            el.style.transform = `rotateY(${((x - 0.5) * 7).toFixed(2)}deg) rotateX(${((0.5 - y) * 7).toFixed(2)}deg)`;
        };
        const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            x = (e.clientX - r.left) / r.width;
            y = (e.clientY - r.top) / r.height;
            if (!raf) raf = requestAnimationFrame(apply);
        };
        const leave = () => {
            cancelAnimationFrame(raf);
            raf = 0;
            el.style.transform = "";
        };
        el.addEventListener("pointermove", move, { passive: true });
        el.addEventListener("pointerleave", leave);
        return () => {
            cancelAnimationFrame(raf);
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerleave", leave);
        };
    }, []);

    return (
        <div data-component="TiltCard" ref={ref} className={`card card-pad stack ${className}`}>
            {children}
        </div>
    );
}
