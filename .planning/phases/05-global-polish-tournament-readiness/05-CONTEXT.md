# Phase 5: Global Polish & Tournament Readiness - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 hardens the product for the 2026 World Cup launch. After Phase 4 closed the engagement features (bonus reveal, peer visibility, league admin tools, shareable snapshots), Phase 5 turns the running app into a shippable product: CI safety net, installable PWA, third locale (French), tightened pixel-art aesthetic, and a measured-not-guessed performance baseline.

**In scope:**
- **CI/CD pipelines (SETUP-04)** — GitHub Actions running `tsc` (web/api/types), `bun run lint`, and the Playwright suite on every PR + push to main. A separate workflow that verifies migrations apply cleanly against an ephemeral Postgres service (catching the kind of `db reset` breakage that bit 04-03 locally).
- **PWA — installable + offline shell (POLISH-01)** — `vite-plugin-pwa` with Workbox: app shell + static assets precached, `NetworkFirst` for Supabase REST and Realtime, install affordance on supported browsers, pixel-art icon set.
- **French localization + string sweep (POLISH-02)** — third locale (`fr.json`) mirroring the EN/ES key set, `LanguageToggle` updated, and a sweep of the remaining hardcoded English strings (knockout stage labels, share/toast errors, dialog headings).
- **Retro theme refinement (POLISH-03)** — replace the Lovable-default OG / meta tags in `index.html`, audit pixel-press / border / accent consistency, document the design tokens. Defined as a *checklist*, not a vibes pass.
- **Load readiness + performance (POLISH-04)** — production-build baseline (Lighthouse + bundle analysis), targeted optimizations (route code-splitting, icon-lib tree-shake, leaderboard query plan review), and a `k6` (or equivalent) script that exercises 200 concurrent users hitting the live endpoints.

**Out of scope:**
- Any new feature work (Phase 4 closed v1.0 features).
- DB schema changes (migrations should be empty for the whole phase).
- Locales beyond EN/ES/FR.
- Performance beyond 200 concurrent users (the PRD target).
- Native iOS/Android apps — PWA only in v1.
- Stripe / billing for premium tier (deferred from Phase 4).

</domain>

<decisions>
## Implementation Decisions

### CI/CD (SETUP-04)

- **D-01: Use GitHub Actions, not external CI.** The repo lives on GitHub; Actions are free for public repos and avoid introducing a second tool. Two workflows: `ci.yml` (type + lint + Playwright) and `migration-check.yml` (supabase CLI vs an ephemeral Postgres service container).
- **D-02: Migration check uses an ephemeral Postgres service container, not the linked remote project.** Avoids needing prod credentials in CI and validates `supabase db reset` cleanly each run — the same gate 04-03 needed to discover the `group_name` phantom-column bug.
- **D-03: Playwright runs in CI with a containerized local Supabase.** The existing webServer in `playwright.config.ts` boots vite; the workflow brings up `supabase start` first. The known pre-existing `auth.spec.ts:19` failure stays a known-failure until PR #29 lands.

### PWA (POLISH-01)

- **D-04: `vite-plugin-pwa` (Workbox under the hood), not a hand-rolled service worker.** Workbox's caching strategies are well-tested; rolling our own SW is footgun territory for a tournament-deadline product.
- **D-05: Caching strategy — app shell + static = `precacheAndRoute`, Supabase REST + Realtime = `NetworkFirst` with a small fallback cache.** The data is real-time and authoritative; offline-first would show stale leaderboards/predictions, which is worse than a "you're offline" toast.
- **D-06: Auto-update mode (`registerType: 'autoUpdate'`).** Tournament window is intense — users on stale bundles is worse than a forced refresh. Show a Sonner toast when an update is applied so the user knows.
- **D-07: Pixel-art icon set.** Generate from a single 512×512 source SVG (existing pixel-art aesthetic). Standard sizes: 192, 512, plus a maskable variant.

### French localization (POLISH-02)

- **D-08: FR mirrors the EN key set verbatim (no extra keys).** The existing `EnsureComplete` compile-time check on `i18n/index.tsx` enforces parity; adding a new locale is purely a JSON file + a `Lang` union update.
- **D-09: Sweep the hardcoded English stragglers in the same plan.** Knockout stage labels in `PredictTab.getStageName`, error toasts in `RankingTab.handleShare`, dialog copy in `LeagueTab` regenerate confirmation. Otherwise FR will look broken in those spots.

### Theme refinement (POLISH-03)

- **D-10: Replace the Lovable-default `og:*` / `twitter:*` meta tags in `apps/web/index.html`.** Currently they point at a Lovable preview image — bad for first impressions of shareable links. Replace with a fuut-branded OG image + correct title/description.
- **D-11: The theme audit is a defined checklist.** Not "make it look nicer." The checklist: (a) every primary CTA uses the same pixel-press border weight, (b) accent color usage is consistent (gold = current-user / featured, green = success, red = danger, blue = neutral admin), (c) `tracking-[0.3em]` retro vocabulary appears only on status badges and bonus locks, (d) all top-level page headers use the `🏆/⚽/👥` emoji prefix pattern.
- **D-12: Design tokens documented in a markdown file alongside the index.css.** A short table mapping color tokens → semantic usage, so future contributors don't re-invent.

### Performance / load (POLISH-04)

- **D-13: Lighthouse for client-side, k6 for server-side load.** Lighthouse runs against a production build served by `vite preview`; k6 hits the staging Supabase project with simulated leaderboard reads + prediction writes.
- **D-14: 200 concurrent users = the PRD target.** Not "as many as possible" — the test should pass/fail against the explicit threshold (p95 latency under a defined budget across the critical endpoints: `get_leaderboard`, `get_matches_with_bonus`, `predictions` upsert, `leaderboard_snapshots` realtime).
- **D-15: Route code-splitting via React.lazy for the public `/s/:token` page and the `/admin` subtree.** They're rarely loaded by the average user and pulling their bundle out keeps the home payload smaller. The Snapshot route's `html-to-image` dep is the biggest single saver here.

### Wave / sequencing

- **D-16: Wave 1 = 05-01 (CI) alone.** Every later plan benefits from automated checks.
- **D-17: Wave 2 = 05-02 (PWA) + 05-03 (FR) in parallel.** No file overlap.
- **D-18: Wave 3 = 05-04 (theme).** Depends on 05-03 because French strings are longer than EN/ES and stress tight pixel-art layouts; auditing layouts before all locales are in produces wasted work.
- **D-19: Wave 4 = 05-05 (perf).** Measures the final shipping build, not an interim version.

### Claude's discretion

- Exact PWA cache versioning / asset hashing approach (Workbox defaults are fine unless we hit a precache size limit).
- Whether to write a custom maskable PWA icon or generate from the favicon source.
- The exact French translation of each key — Spanish-derived where idiom matches, otherwise straight-forward FR.
- Where to host the k6 script (likely `tests/load/leaderboard.k6.js`) and whether to commit a baseline run or just the script.
- Whether to add a small "An update is available — refresh" prompt component for the PWA `autoUpdate` flow, or trust the auto-refresh.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product source-of-truth docs
- `Docs/product/requirements.md` — POLISH-01..04 + SETUP-04 acceptance language.
- `Docs/HANDOFF.md` — performance expectations + launch checklist (if it exists).

### Prior phase contexts (carry-forward decisions)
- `.planning/phases/04-social-bonus-predictions/04-CONTEXT.md` — D-15 SOCIAL-04 toast pattern (reused for the PWA update toast); D-08 reveal countdown vocabulary (style consistency).
- `.planning/STATE.md` — DEC-018 admin subtree (code-splitting candidate); DEC-020 column lockdown (a CI migration-check target).
- `.planning/phases/03-scoring-real-time-rankings/03-CONTEXT.md` — D-06 Realtime CDC channel (PWA caching strategy must not break Realtime subscriptions).

### Tech stack inputs
- `apps/web/vite.config.ts` — Vite config to extend with `vite-plugin-pwa`.
- `apps/web/tailwind.config.ts` + `apps/web/src/index.css` — theme tokens.
- `apps/web/src/lib/i18n/index.tsx` — `EnsureComplete` type + `Lang` union to update for FR.
- `apps/web/playwright.config.ts` — CI integration target.
- `supabase/config.toml` + `supabase/migrations/*` — migration-check workflow target.

### Frontend integration points
- `apps/web/src/App.tsx` — where lazy-loaded routes are mounted; PWA registration entry.
- `apps/web/src/components/LanguageToggle.tsx` — FR option to add.
- `apps/web/src/components/tabs/*.tsx` — hardcoded-string sweep targets.
- `apps/web/index.html` — `og:*` / `twitter:*` meta cleanup target.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useTranslation` hook + `EnsureComplete` type guard** — adding a third locale is a JSON file + a 1-line union widening; compile-time check enforces key parity.
- **Sonner toaster** (already mounted in `App.tsx`) — drop-in for the PWA "update available" toast (D-06).
- **`pixel-border` / `pixel-inset` utility classes** — already standardized across most components; the theme audit is mostly about enforcing them consistently in the few places that diverge.
- **React Query** (already wired) — its `staleTime` and `refetchOnWindowFocus` config interacts with the PWA cache strategy; pick conservative settings.

### Gaps to fill
- **No `.github/workflows/`** at all — Plan 05-01 starts from zero. Project uses `bun`, so workflows must `oven-sh/setup-bun@v2`.
- **No PWA artifacts** — no manifest, no service worker, no icons. Plan 05-02 starts from zero.
- **No FR locale** — `i18n/index.tsx` currently has `type Lang = "en" | "es"`.
- **Lovable defaults in `index.html`** — `og:image`, `og:title`, `twitter:*` all point at a Lovable preview asset. Trivial to fix but needs the right replacement assets.

### Established Patterns (do not re-invent)
- **Per-task atomic commits** with `feat(05-XX): ...` scope.
- **Migration-as-source-of-truth** for any SQL (none expected in Phase 5).
- **EN/ES i18n with EnsureComplete** — extend this pattern, don't replace it.
- **`bun --bun vite`** for the dev server (Vite native-binary mismatch workaround per CLAUDE.md).
- **`supabase db reset`** as the canonical "does the migration set apply cleanly" check.

### Integration Points
- **`leaderboard_snapshots` realtime channel** — PWA caching for `/realtime/v1/*` must allow WS through (`NetworkOnly`, not cached).
- **`get_matches_with_bonus` RPC + `predictions` upsert** — the two write/read paths under load test in 05-05.
- **`apps/api/` is a separate Vercel deployment** — CI must type-check both webs/api workspaces independently.

</code_context>

<specifics>
## Specific Ideas

- Use the existing **🎮 fuut pixel-art aesthetic** for PWA icons — same color palette as the in-app, retro chunky pixels. A single 512×512 SVG + a Sharp/Squoosh pipeline can generate all required sizes (192, 512, maskable).
- The **"update available" toast** (D-06 PWA) should match the Sonner styling already used by the scoring toast (SOCIAL-04) — same `toast.success` API, same visual weight.
- French translations should **prefer the formal/neutral register** ("Bonus surprise" not slang), matching the EN/ES tone.
- The k6 load test should mirror the **realistic user flow**: open Predict → set a score → submit → open Ranking. Not raw RPC hammering.
- The replacement OG image (D-10) should be a **branded fuut banner** at 1200×630, not a screenshot — generic enough to use as the default for ALL shared links, including snapshot-less ones.

</specifics>

<deferred>
## Deferred Ideas

- Push notifications via Web Push API (depends on PWA infra; deferred to v2 because tournament window is tight and notification UX needs design work).
- Background sync for offline prediction submissions (the `NetworkFirst` strategy doesn't queue writes — if you're offline, the upsert just fails. Real offline-write support is a v2 feature).
- Native iOS/Android apps (PWA-only in v1).
- Locales beyond EN/ES/FR (Portuguese, German, etc.).
- Performance beyond 200 concurrent users (the 2026 host-cities target).
- A dedicated CDN for static assets (Vercel's edge cache covers v1).
- Stripe / billing for premium tier (still deferred from Phase 4 D-23).

</deferred>

---

*Phase: 05-global-polish-tournament-readiness*
*Context gathered: 2026-06-01*
