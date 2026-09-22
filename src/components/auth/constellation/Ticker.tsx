import type { ReactNode } from "react";

/**
 * One marquee row. The items are rendered twice so the `translateX(-50%)` loop is seamless; the copy is
 * `aria-hidden` and the row pauses on hover (CSS).
 */
export function Ticker({ items, className }: { items: readonly ReactNode[]; className?: string }) {
    const run = (copy: number) =>
        items.map((item, i) => (
            <span key={`${String(copy)}-${String(i)}`}>
                {item}
                <i aria-hidden />
            </span>
        ));
    return (
        <div data-component="Ticker" className={className} aria-hidden>
            {run(0)}
            {run(1)}
        </div>
    );
}
