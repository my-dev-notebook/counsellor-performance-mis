"use client";

import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Tooltip } from "@/components/Tooltip";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    const label = isDark ? "Switch to light mode" : "Switch to dark mode";

    return (
        <Tooltip content={label}>
            <button
                type="button"
                data-component="ThemeToggle"
                onClick={toggleTheme}
                aria-label={label}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
                {isDark ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
            </button>
        </Tooltip>
    );
}
