# Project rules

- Use `pnpm` for all package management and script execution in this repo (e.g. `pnpm install`, `pnpm run typecheck`, `pnpm run lint`). Do not use `npm` or `yarn` — the project is locked to `pnpm-lock.yaml`.
- Every React component's root JSX element must carry a `data-component="ComponentName"` attribute matching the function name (e.g. `<div data-component="CounsellorTable" ...>`), so it can be identified in the browser via DevTools/inspect. This applies to internal helper components too (e.g. `Select` inside `FilterBar.tsx`, `KpiCard` inside `KpiCards.tsx`), not just the file's default export. When a component has multiple possible root returns (e.g. an early-return empty state vs. the main render), add the attribute to each root. New components must include this attribute from the start.
- Do not run `pnpm run typecheck` or `pnpm run lint` proactively after making changes. The user runs these themselves — only run them if explicitly asked to.
