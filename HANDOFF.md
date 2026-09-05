# Handoff — M1 (Scaffold & Toolchain) complete, M2 (Parser core) next

**Context:** implementing `tmp/PLAN.md` (v4, planning complete). This note is
for whichever session picks this up next.

**Repo state:** nothing committed yet — `git log` is still empty, everything
below exists only as untracked working-tree files. Check `git status` first.
The prior Windows session got M1 to "all local gates green" but couldn't get
a Cloudflare deploy working (Windows blocks the symlinks OpenNext needs) and
handed off to a WSL session (archlinux distro) to finish that piece. **That
WSL session is this one, and it's done.**

---

## M1 — fully complete, including the Cloudflare deploy

All five M1 gates (PLAN.md §9) are green, verified together in this WSL
session:

- `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test` — all pass
- `pnpm build` (plain `next build`) — succeeds
- `pnpm exec opennextjs-cloudflare build && pnpm exec wrangler deploy` —
  **succeeds**, live at https://counsellor-performance-advanced-mis.emmie10x.workers.dev

Stack/tooling versions are as the prior session left them (Next 16.3.4,
React 19.2.8, TS 5.9.3 strict, ESLint 9 flat config, Prettier 3.9.6, Vitest
4.1.11, `@opennextjs/cloudflare` 1.20.5, wrangler 4.128.0) — see git history
of this file if you need the original write-up; not repeated here.

### Two real deviations from the plan/scaffold — both already fixed, flag to user if not already done

1. **`eslint-plugin-neverthrow` (§8.1) is not installed.** Tried and reverted
   by the prior session: the plugin's `must-use-result` rule reads
   `context.parserServices` directly, an API `typescript-eslint` v8 no longer
   populates (moved to `context.sourceCode.parserServices`) — throws on every
   file regardless of parser config. Confirmed by reading the rule's source.
   Currently relying on code discipline instead of a lint rule. Swap a
   maintained alternative back in if one appears; don't re-add this package
   as-is.

2. **pnpm couldn't run at all in this WSL session, now fixed.** `package.json`
   pinned `"packageManager": "pnpm@11.25.0"`, but pnpm 11's self-management
   feature (which auto-switches to the pinned version on every invocation,
   including `pnpm -v` and `pnpm config set`) resolved its target binary to
   `/mnt/c/Users/Supriya Singh/.pnpm-store/v11/links/@/pnpm/11.25.0/.../bin/pnpm`
   — a path on the Windows side of the drvfs mount that didn't exist, and
   pnpm doesn't auto-download it, just fails with `ENOENT`. This blocked
   _every_ pnpm command, including the config command meant to disable the
   feature — a chicken-and-egg lockout. Confirmed the system pnpm (installed
   via pacman, `/usr/sbin/pnpm`) is actually v11.3.0, so re-pinned
   `packageManager` to `pnpm@11.3.0` to match what's really installed. Fixed
   by editing `package.json` directly (approved by the user after two rounds
   of diagnosis — see this session's transcript if you want the full trail).
   **If you reinstall/upgrade pnpm on this machine, re-check this pin.**

3. **`wrangler.jsonc`'s `compatibility_date` was auto-set to today's date at
   scaffold time (`2026-09-03`) and Cloudflare's API rejected it** ("Can't
   set compatibility date in the future", code 10021) — Cloudflare's own
   rollout of compat-date support lags behind a fresh local clock date.
   Changed to `2024-09-23` (a long-established, safe compatibility date that
   already includes `nodejs_compat` v2 defaults). No functional flags in this
   project depend on anything newer, so this is safe, but if you add newer
   Workers runtime features later and hit a "requires compatibility_date >=
   X" error, bump this deliberately rather than pointing it at "today" again.

### Cloudflare deploy credentials

`.env` (gitignored) has `CLOUDFLARE_API_TOKEN`. Account ID
`0764000448c72fb336573aed75539841` was provided directly by the user in
chat — not stored in any repo file; export `CLOUDFLARE_ACCOUNT_ID` yourself
if you need to redeploy (`wrangler.jsonc` intentionally doesn't hardcode it).

---

## What's NOT done yet (everything past this point is untouched)

- **M2 — Parser core** (§4, the highest-risk piece per the plan): nothing
  written. `src/lib/parser/*` doesn't exist. This is where almost all the
  real complexity lives — the fuzzy team-sheet matcher (§2.4), header-row
  location (§3), the alias map (§2.3), coercion (§2.6 landmines), and
  aggregation/reconciliation (§2.6.10). Vitest is configured and the four
  fixture workbooks are already in `test/fixtures/`, specifically so M2 can
  be written test-first per the plan.
- **M3 — Upload + Parse Report:** not started.
- **M4 — Dashboard** (§5, all of 5.1–5.9): not started. `src/app/page.tsx`
  is still the default create-next-app placeholder page.
- **M5 — polish:** not started (blocked behind M2–M4). Deploy pipeline
  itself is now proven working, so M5 is just "ship the real app through the
  already-working path," not "get deploys working."

## Useful things to know before continuing

- Read `tmp/PLAN.md` in full before writing any parser code — §2 (source
  data landmines) and §6 (derived metrics) are load-bearing; getting them
  wrong silently produces wrong numbers, not a crash.
- `tmp/ANS.md`, `tmp/DOUBTS.md`, `tmp/ENHANCEMENTS.md` hold the planning
  decision log — check there before re-litigating anything in PLAN.md §10.
- No canonical schema (Q20) — the four fixtures in `test/fixtures/` are
  deliberately different shapes; the parser must tolerate all four, not
  normalize toward one.
- `neverthrow`'s `Result` type is used throughout `lib/parser`/`lib/metrics`
  per §8.2 — unwrap once at the React boundary into `DashboardState`, never
  let a `Result` leak into a component prop.
- Nothing has been committed to git yet. The first commit is still pending —
  check with the user about commit granularity (e.g., one commit for M1
  toolchain, separate commits per milestone) before just committing
  everything in one shot.
- This repo lives on `/mnt/c/...` (Windows drvfs mount) even when worked on
  from WSL. That's fine for everything proven in this session (install,
  build, OpenNext build, deploy all work from here) — no need to move it to
  a Linux-native path unless a new problem specifically points at drvfs.
