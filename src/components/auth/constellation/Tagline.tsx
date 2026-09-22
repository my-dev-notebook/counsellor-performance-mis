"use client";

import { useEffect, useState, type CSSProperties } from "react";

/** Position of letter `n` of word `w` in the whole tail, so the stagger runs across words. */
function letterIndex(tail: string, w: number, n: number) {
    let offset = 0;
    const words = tail.split(" ");
    for (let i = 0; i < w; i++) offset += Array.from(words[i] ?? "").length + 1;
    return offset + n;
}

/**
 * The rotating tail of "Counsellor Performance is …". Each letter fades/blurs in on its own delay (`--n`);
 * remounting the `<em>` (keyed by index) restarts the CSS animation, so the only JS is a slow interval. Words are
 * inline-block so the line only wraps at spaces (letters are atomic inlines and would otherwise break anywhere).
 */
export function Tagline({
    tails,
    hold = 3300,
    className,
    emClass,
}: {
    tails: readonly string[];
    /** ms each tail stays */
    hold?: number;
    className?: string;
    emClass: string;
}) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (tails.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const timer = setInterval(() => {
            if (!document.hidden) setIndex((i) => (i + 1) % tails.length);
        }, hold);
        return () => {
            clearInterval(timer);
        };
    }, [tails, hold]);

    const tail = tails[index] ?? "";
    const words = tail.split(" ");

    return (
        <span data-component="Tagline" className={className}>
            <em key={index} className={emClass}>
                {words.map((word, w) => (
                    <span key={w} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                        {Array.from(word).map((ch, n) => (
                            <i key={n} style={{ "--n": letterIndex(tail, w, n) } as CSSProperties}>
                                {ch}
                            </i>
                        ))}
                        {w < words.length - 1 ? "\u00a0" : null}
                    </span>
                ))}
            </em>
        </span>
    );
}
