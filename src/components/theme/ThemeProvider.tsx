"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

/**
 * Owns the light/dark theme choice app-wide. The `<html>` element's initial
 * `data-theme` is set synchronously by an inline script in the root layout
 * (before first paint) and by the lazy `useState` initializer here, which
 * read the same `localStorage` key — so they agree and there's no flash.
 * The `useLayoutEffect` re-applies the attribute on mount to undo React
 * Strict Mode's dev-only remount, which otherwise clears it (see Next.js's
 * "preventing flash before hydration" guide).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("theme", next);
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
