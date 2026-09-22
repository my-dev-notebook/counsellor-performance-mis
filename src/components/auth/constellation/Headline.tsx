"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#01";

function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Headline that scrambles from one line to the next: each letter flickers through glyphs for a while, then
 * "lands" with a pop. Runs on the DOM directly (innerHTML while scrambling, plain text at rest) so React never
 * re-renders per frame; the first line is server-rendered so there is no flash.
 */
export function Headline({
    lines,
    hold = 4400,
    className,
    scrambleClass,
    landClass,
}: {
    lines: readonly string[];
    /** ms each line stays before the next scramble */
    hold?: number;
    className?: string;
    scrambleClass: string;
    landClass: string;
}) {
    const ref = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || lines.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const h = el;
        let index = 0;
        let raf = 0;
        let settle = 0;

        function scramble(to: string) {
            const from = h.textContent ?? "";
            const len = Math.max(from.length, to.length);
            const cells = Array.from({ length: len }, (_, i) => {
                const start = Math.floor(Math.random() * 20);
                return {
                    from: from[i] ?? "",
                    to: to[i] ?? "",
                    start,
                    end: start + 8 + Math.floor(Math.random() * 22),
                    glyph: "",
                };
            });
            let f = 0;
            const step = () => {
                let out = "";
                let done = 0;
                for (const c of cells) {
                    if (f >= c.end) {
                        done++;
                        out += c.to === " " ? " " : `<span class="${landClass}">${escapeHtml(c.to)}</span>`;
                    } else if (f >= c.start) {
                        if (!c.glyph || Math.random() < 0.3)
                            c.glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? "#";
                        out += `<span class="${scrambleClass}">${escapeHtml(c.glyph)}</span>`;
                    } else out += escapeHtml(c.from);
                }
                h.innerHTML = out;
                f++;
                if (done < cells.length) raf = requestAnimationFrame(step);
                else
                    settle = window.setTimeout(() => {
                        h.textContent = to;
                    }, 400);
            };
            step();
        }

        const timer = setInterval(() => {
            if (document.hidden) return;
            index = (index + 1) % lines.length;
            scramble(lines[index] ?? "");
        }, hold);
        return () => {
            clearInterval(timer);
            cancelAnimationFrame(raf);
            clearTimeout(settle);
        };
    }, [lines, hold, scrambleClass, landClass]);

    return (
        <h1 data-component="Headline" ref={ref} className={className}>
            {lines[0]}
        </h1>
    );
}
