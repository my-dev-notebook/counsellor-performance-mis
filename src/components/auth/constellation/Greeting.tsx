"use client";

import { useEffect, useState } from "react";

/** "Good morning · Monday, 22 September" — resolved on the client after mount so server and client HTML match. */
export function Greeting({ className, dotClass }: { className?: string; dotClass?: string }) {
    const [text, setText] = useState("Welcome back");

    useEffect(() => {
        const tick = () => {
            const d = new Date();
            const h = d.getHours();
            const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
            setText(`${part} · ${d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}`);
        };
        tick();
        const timer = setInterval(tick, 60_000);
        return () => {
            clearInterval(timer);
        };
    }, []);

    return (
        <span data-component="Greeting" className={className}>
            <span className={dotClass} aria-hidden />
            <span>{text}</span>
        </span>
    );
}
