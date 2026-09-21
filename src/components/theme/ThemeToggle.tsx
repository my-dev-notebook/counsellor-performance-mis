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
                className="btn btn-ghost btn-icon btn-sm"
            >
                {isDark ? <FiSun aria-hidden /> : <FiMoon aria-hidden />}
            </button>
        </Tooltip>
    );
}
