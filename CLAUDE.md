# Project rules

- Use `pnpm` for all package management and script execution in this repo (e.g. `pnpm install`, `pnpm run typecheck`, `pnpm run lint`). Do not use `npm` or `yarn` — the project is locked to `pnpm-lock.yaml`.
- Every React component's root JSX element must carry a `data-component="ComponentName"` attribute matching the function name (e.g. `<div data-component="CounsellorTable" ...>`), so it can be identified in the browser via DevTools/inspect. This applies to internal helper components too (e.g. `Select` inside `FilterBar.tsx`, `KpiCard` inside `KpiCards.tsx`), not just the file's default export. When a component has multiple possible root returns (e.g. an early-return empty state vs. the main render), add the attribute to each root. New components must include this attribute from the start.
- Do not run `pnpm run typecheck` or `pnpm run lint` proactively after making changes. The user runs these themselves — only run them if explicitly asked to.
- Do not do visual/browser testing (starting a dev server, installing Playwright/Chromium, taking screenshots, etc.) after making UI changes. The user does their own visual testing. Just make the code change and let them check it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
