"use client";

import type { ReactNode } from "react";
import { FiGithub } from "react-icons/fi";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Tooltip } from "@/components/Tooltip";

const REPO_URL = "https://github.com/my-dev-notebook/counsellor-performance-mis";

/**
 * Deployed commit, short form. `NEXT_PUBLIC_GIT_SHA` is inlined at build time; until the build sets it
 * the chip shows a placeholder and links to the repo's commit list instead of one commit.
 */
const GIT_SHA = process.env.NEXT_PUBLIC_GIT_SHA ?? "";
const SHORT_SHA = GIT_SHA === "" ? "0000000" : GIT_SHA.slice(0, 7);
const COMMIT_URL = GIT_SHA === "" ? `${REPO_URL}/commits` : `${REPO_URL}/commit/${GIT_SHA}`;

/**
 * Repo link, deployed-commit chip and theme toggle, shared by the signed-in `AppHeader` and the sign-in
 * pages' `AuthHeader`. `children` slot in between for signed-in extras (the notifications bell), keeping
 * the design system's order: GitHub · bell · theme · avatar.
 */
export function HeaderActions({ children }: { children?: ReactNode }) {
    return (
        <div data-component="HeaderActions" className="contents">
            <span className="gh-link">
                <Tooltip content="Source on GitHub">
                    <a
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Source on GitHub"
                        className="btn btn-ghost btn-icon"
                    >
                        <FiGithub aria-hidden />
                    </a>
                </Tooltip>
                <Tooltip content="Deployed commit — open on GitHub">
                    <a href={COMMIT_URL} target="_blank" rel="noopener noreferrer" className="sha">
                        {SHORT_SHA}
                    </a>
                </Tooltip>
            </span>
            {children}
            <ThemeToggle />
        </div>
    );
}
