"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function readStoredTheme(): Theme | null {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return stored === "dark" || stored === "light" ? stored : null;
    } catch {
        return null;
    }
}

function systemTheme(): Theme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Owns the light/dark theme choice app-wide. The `<html>` element's initial
 * `data-theme` is set synchronously by an inline script in the root layout
 * (before first paint) when the user has chosen a theme; otherwise the tokens
 * follow `prefers-color-scheme` on their own. React's own `theme` state must
 * still start as "light" on both server and client — reading `localStorage`
 * or `matchMedia` during the initial render would make the client's first
 * render diverge from the server-rendered HTML and trigger a hydration
 * mismatch. The `useLayoutEffect` below resolves the real value right after
 * mount, before paint, and keeps following the OS until the user toggles.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>("light");

    useLayoutEffect(() => {
        const stored = readStoredTheme();
        if (stored) {
            setTheme(stored);
            applyTheme(stored);
            return;
        }
        setTheme(systemTheme());
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const onChange = () => {
            if (readStoredTheme() === null) setTheme(systemTheme());
        };
        media.addEventListener("change", onChange);
        return () => {
            media.removeEventListener("change", onChange);
        };
    }, []);

    const toggleTheme = () => {
        setTheme((prev) => {
            const next: Theme = prev === "dark" ? "light" : "dark";
            try {
                window.localStorage.setItem(STORAGE_KEY, next);
            } catch {
                // Private mode or blocked storage: the choice still applies for this page view.
            }
            applyTheme(next);
            return next;
        });
    };

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
    return ctx;
}
