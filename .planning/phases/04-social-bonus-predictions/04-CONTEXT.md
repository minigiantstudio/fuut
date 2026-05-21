# Phase 4: Social & Bonus Predictions - Context

**Gathered:** 2026-05-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 adds engagement-and-retention features on top of the live scoring core delivered in Phase 3.

**In scope:**
- **Custom Micro-Predictions (SOCIAL-01)** — A curated, tournament-wide catalog of yes/no bonus questions (one per match), with admin-configurable reveal timing.
- **Match History / Peer Visibility (SOCIAL-02)** — Reveal other league members' predictions on a match after it transitions to SCORED.
- **Shareable Ranking Snapshots (SOCIAL-03)** — Pixel-art PNG + public tokenized URL (`/s/<token>`) shareable to WhatsApp/Telegram, with OG meta-tag previews.
- **In-app Scoring Feedback (SOCIAL-04)** — Sonner toast on every match-scored event, paired with the existing Phase 3 realtime leaderboard channel.
- **League Admin Tools (LEAGUE-03)** — Admins can rename their league and remove members from `LeagueTab` (no separate admin screen).
- **Free vs Premium League Size Limits (LEAGUE-04)** — Server-enforced free-tier member cap (env-var configurable, default 10). Premium = unlimited, flipped manually by the global admin from `/admin`.

**Out of scope:**
- League-admin-authored or player-suggested custom predictions (PRD §4 paths 1 + 2 + 3 — deferred).
- Multi-choice or numeric bonus question types (yes/no only in v1).
- Multiple bonus questions per match.
- Per-league overrides of the reveal window.
- "Early bonus reveal" as a premium feature (design-spec §3 — deferred).
- Persistent in-app activity/notification feed (toasts only in v1).
- Browser Push API notifications (depends on Phase 5 POLISH-01 PWA infra).
- Reset-scores admin tool and admin-transfer tool (both deferred).
- Stripe / billing infrastructure (premium upgrades are manual via global admin).

</domain>

<decisions>
## Implementation Decisions

### Custom Micro-Predictions (SOCIAL-01)

- **D-01: Data model — curated tournament-wide catalog.** No per-league custom predictions in v1. The catalog is a fixed list (~30 yes/no events) seeded at deploy time; admin only resolves outcomes. Diverges from PRD §4's three authoring paths — all deferred.
- **D-02: Catalog storage — hybrid TS seed + DB table.** Ship a `bonus_question_catalog(id, prompt_text, category, ...)` table seeded from a TypeScript catalog file on migration. DB becomes the source of truth, enabling a future admin "manage catalog" UI without re-seeding.
- **D-03: One bonus question per match.** Preserves the existing `matches.bonus_question` / `matches.bonus_result` columns (Phase 3). The catalog supplies the prompt; the assignment to a specific match is done at seed time.
- **D-04: Yes/No question type only.** Multi-choice and numeric are deferred.
- **D-05: Fixed +2 point value.** Inherits Phase 3 D-04. Admin-defined per-question points rejected after the pivot to a curated catalog.
- **D-06: Where users answer — inline on PredictTab match cards.** No new bottom-nav tab. The bonus question lives on its match's card. (Removes the "Bonus" tab idea that was briefly considered.)
- **D-07: Reveal timing — admin-configurable, default 60 min before kickoff.** Stored as a single value in a server-side config row (e.g., `app_config.bonus_reveal_lead_minutes`) and computed at read time per match (not denormalized into a per-match column). Editable from the global `/admin` route. Tournament-wide value; per-league overrides deferred.
- **D-08: Pre-reveal UI — locked placeholder + countdown.** Before `now >= match.kickoff_at - bonus_reveal_lead_minutes`, render a locked placeholder card: `🔒 Surprise bonus reveals in Xh Ym`. Mirrors Phase 2 D-09 countdown vocabulary. The server ships **only** the `reveal_at` timestamp to the client; question text is redacted via RPC (or RLS-secured view) until reveal time — clients cannot scrape the catalog ahead of time.

### Match History / Peer Visibility (SOCIAL-02)

- **D-09: Peer predictions visible only after SCORED.** Other league members' predictions for a match stay hidden until the match transitions to SCORED — preserves suspense through the live match window. Diverges from Phase 2 D-10 (LOCKED-at-kickoff) — that locking rule is unchanged; this is solely about peer visibility.
- **D-10: Surface — inline expansion on PredictTab SCORED match cards.** Tap a SCORED card to expand and reveal all league members' predicted scores in a list. Reuses the existing card shell + mirrors the SOCIAL-01 inline-bonus pattern. No new tab.

### Shareable Ranking Snapshots (SOCIAL-03)

- **D-11: Share both image + URL.** Render a pixel-art PNG client-side (via `html-to-image` or equivalent) **and** mint a short public URL `/s/<token>` with OG meta tags so WhatsApp/Telegram render a preview. Recipients without the app see a teaser landing page + a "Join →" CTA.
- **D-12: Snapshot layout — top-3 podium + "You" card + last-matchday recap.** Story-driven, scales for leagues of any size. The sharer always sees themselves on the snapshot regardless of their rank.
- **D-13: Distribution — Web Share API with explicit fallback buttons.** On mobile (`navigator.share` available) opens the native share sheet; on desktop fall back to explicit WhatsApp, Telegram, and Copy-link buttons.
- **D-14: Public snapshot model — tokenized URL, never expires.** New table `snapshot_tokens(token text PK, league_id uuid, snapshot_payload jsonb, created_by uuid, created_at timestamptz)`. The payload is a **frozen copy** of the rendered snapshot data — future leaderboard changes don't rewrite history. Storage growth is bounded by share-frequency × tournament-duration; acceptable for a single-tournament app.

### In-app Scoring Feedback (SOCIAL-04)

- **D-15: Trigger — every match scored.** Whenever a match transitions to SCORED, every league member receives a Sonner toast. Reuses the existing Sonner toaster already wired in `apps/web/src/App.tsx` and the Phase 3 D-06 realtime `leaderboard_snapshots` channel. No schema changes.
- **D-16: Toast copy template.** `Match X scored — you earned Y pts (#N ↑/↓)`. Pulls user-specific points and rank delta from the realtime payload.
- **D-17: No persistent activity feed in v1.** Toasts are ephemeral. If a user misses a toast they can still see the rank delta on `RankingTab`. No notifications table, no read-state, no bell icon. Activity feed deferred as v2.

### League Admin Tools (LEAGUE-03)

- **D-18: Admin tools that ship in v1 — rename league + remove members.** Reset-scores deferred (dangerous, rarely used in practice). Transfer-admin deferred (single-admin model continues; documented as a known gap).
- **D-19: UI surface — inline icons inside `LeagueTab` (no separate admin screen).** A pencil icon next to the league name (admin only) opens an inline rename input. A trash icon next to each non-admin member row (admin only) opens a confirm dialog and calls a new `remove_member` RPC. Reuses the existing `isAdmin` prop and `LeagueTab` shell.
- **D-20: Removal effect — soft remove.** Removing a member deletes only their `league_members` row. Their `predictions` rows for this league are **kept** (orphan rows under `user_id` — no `league_members` join). They no longer appear on the leaderboard or in `LeagueTab`. If they re-join with the invite code, the orphan predictions remain attached to their user but only re-surface when a new `league_members` row exists. No cascading deletes.

### Free vs Premium League Size Limits (LEAGUE-04)

- **D-21: Server-enforced cap, env-var configurable, default 10.** Add `leagues.tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium'))`. Free-tier cap is read from env var `LEAGUE_FREE_MAX_MEMBERS` (default `10`) — not hardcoded — so it can be tuned post-launch without a migration. Premium tier = unlimited. Enforcement happens server-side in the join RPC (and in any admin-driven add-member flow), so the client cannot bypass it.
- **D-22: Join-blocked UX — sonner toast on `/join/<code>` + "Request premium" button for the admin.** When the join would exceed the cap, the join RPC returns a structured "league full" error. Joiner sees: `This league is full (N/N). Ask the admin to upgrade for unlimited members.` Inside `LeagueTab`, when the admin opens a full league they see a "Request premium" affordance — a `mailto:<ADMIN_CONTACT_EMAIL>` link prefilled with the league name + invite code. `ADMIN_CONTACT_EMAIL` is a new env var on the API. (POST-to-`/admin`-inbox alternative deferred — would require building an inbox UI.)
- **D-23: Premium grant — manual flip by global admin.** No Stripe / billing in v1. The global admin (Phase 3 D-08 isolated `/admin` subtree) gets a new admin action: "Flip league to premium" — sets `leagues.tier = 'premium'`. Once flipped, the cap no longer applies. There is no auto-downgrade or revocation path in v1.

### Claude's Discretion

- Exact pixel-art layout of the snapshot PNG (subject to UI-SPEC pass — see UI hints in `Docs/product/design-specification.md`).
- Exact migration shape for `bonus_question_catalog`, `snapshot_tokens`, `app_config`, and the `leagues.tier` column (planner will compose them, ideally in a single phase-4 migration file).
- Whether peer predictions for SCORED matches are fetched eagerly with the match list or lazily on card expand (planner can choose based on payload size).
- Exact RLS / RPC strategy that redacts pre-reveal bonus question text (CHECK policy on a view, or a `get_match_with_bonus` RPC that strips the prompt when `now < reveal_at`).
- Whether the global-admin "Flip to premium" action is a button row in the existing match-result-entry table or a new section in `/admin`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product source-of-truth docs
- `Docs/product/requirements.md` §4 (Micro-predictions — the PRD path Phase 4 partially diverges from)
- `Docs/product/design-specification.md` §3 (Bonus mechanics + Premium Features — "Early Bonus" deferred)
- `Docs/HANDOFF.md` §2 (open questions on bonus weighting + shareable URL — partially closed by this phase)
- `Docs/product/lovable-handoff.md` (UX inventory; "viejitos"-friendly retro pixel constraint)

### Prior phase contexts (carry-forward decisions)
- `.planning/phases/02-league-prediction-core/02-CONTEXT.md` — D-09 "Locks in Xh Ym" countdown vocabulary (reused by D-08 reveal countdown); D-10 LOCKED state mechanics (unchanged by SOCIAL-02 peer visibility); D-11 invite-code format
- `.planning/phases/03-scoring-real-time-rankings/03-CONTEXT.md` — D-04 fixed +2 carries to D-05 here; D-06 Realtime CDC channel reused for D-15 SOCIAL-04 toast trigger; D-08 isolated `/admin` subtree extended for D-07 reveal config + D-23 premium flip
- `.planning/STATE.md` DEC-018 — admin lives at `apps/web/src/admin/` with its own JWT (relevant to D-07, D-23)

### Schema and types
- `supabase/migrations/20260401000000_init_schema.sql` — baseline `matches.bonus_question / bonus_result`, `predictions`, `leagues` table shape (no `tier` column yet — Phase 4 adds it), `league_members.role` CHECK constraint
- `supabase/migrations/20260504000001_phase2_league.sql` — `create_league`, `regenerate_invite_code`, `join_league_by_code` RPCs (the new `remove_member` RPC should follow the same shape)
- `supabase/migrations/20260511000000_phase3_scoring.sql` — `predictions.bonus_answer`, scoring updates (Phase 4 doesn't change scoring math)
- `packages/types/src/database.types.ts` — regenerate after the Phase 4 migration

### Frontend integration points
- `apps/web/src/components/tabs/PredictTab.tsx` — match cards; extend with inline bonus question (D-06) and inline SCORED expansion for peer predictions (D-10)
- `apps/web/src/components/tabs/RankingTab.tsx` — Phase 3 realtime subscription; pair with the new sonner toast for D-15 SOCIAL-04
- `apps/web/src/components/tabs/LeagueTab.tsx` — extend admin section with rename pencil + per-row trash icons (D-19); add "Request premium" mailto when cap is hit (D-22)
- `apps/web/src/components/ui/sonner.tsx` + `apps/web/src/App.tsx` — Sonner toaster is already wired; reuse for SOCIAL-04 + LEAGUE-full join error
- `apps/web/src/admin/` subtree — extend with the bonus-reveal-window config editor (D-07) and the "Flip to premium" admin action (D-23)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`BonusPrediction` component** — Prototype UI lives in repo (Phase 3 wired persistence); D-06 + D-08 build on its current card shape (locked placeholder vs. answerable card).
- **Sonner toaster** (`apps/web/src/components/ui/sonner.tsx`) — Already mounted in `App.tsx`. Drop-in for D-15 (SOCIAL-04 match-scored toast) and D-22 ("League full" join error).
- **Phase 3 realtime channel** — `RankingTab.tsx` already subscribes to `leaderboard_snapshots` via `supabase.channel(...)`. Reuse the same channel (or a sibling on the `matches` table) for D-15 toast trigger.
- **`isAdmin` prop pattern** — `LeagueTab.tsx` already receives `isAdmin: boolean` and gates the regenerate-invite-code button on it. D-19 (pencil + trash icons) extends the same pattern.
- **Shadcn `dialog.tsx`** — Used for regenerate-code confirmation. Reuse for D-19 remove-member and rename-league confirmations.
- **`leagues.invite_code` UNIQUE + 4-char generator** — Phase 2 D-11. No reuse here, but pattern (server-generated short identifier) maps to D-14 snapshot token generation.

### Established Patterns
- **Data fetching:** `useQuery` + Supabase client; no different pattern for Phase 4 (peer-prediction fetches join through the existing prediction query).
- **Optimistic mutations:** `supabase.upsert(...)` then `queryClient.invalidateQueries(...)` (PredictTab style). Apply to D-19 admin actions.
- **Realtime invalidation:** Phase 3 D-06 — subscribe to a channel, invalidate the React Query on row events. Reuse for D-15 toast + leaderboard refresh combo.
- **Admin auth:** Isolated `/admin` subtree with its own JWT (Phase 3 DEC-018). D-07 and D-23 belong inside this subtree, not in the main session app.

### Integration Points
- **`predictions` table:** No new columns required for SOCIAL-02 — peer visibility is purely a read-side concern.
- **`matches` table:** No new columns required for SOCIAL-01 — the existing `bonus_question` column is fed by the new `bonus_question_catalog` at seed time. A `reveal_at` field is computed at read time from `kickoff_at - app_config.bonus_reveal_lead_minutes` (no migration on `matches`).
- **`leagues` table:** Add `tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','premium'))`.
- **`league_members` table:** No structural change — soft remove is just a `DELETE WHERE id = ...` from this table.
- **New tables (Phase 4 migration):** `bonus_question_catalog`, `snapshot_tokens`, `app_config` (single-row settings, including `bonus_reveal_lead_minutes`).
- **Express API (`apps/api`):** No new cron jobs. New RPCs: `remove_member`, `rename_league`, `flip_league_tier` (admin-only), plus updates to the join RPC to enforce `LEAGUE_FREE_MAX_MEMBERS`.

</code_context>

<specifics>
## Specific Ideas

- The locked-bonus placeholder copy (D-08) should match the Phase 2 D-09 "Locks in Xh Ym" vocabulary verbatim — `🔒 Surprise bonus reveals in Xh Ym`. Same `text-[14px] tracking-[0.3em]` retro styling used on existing match cards.
- The snapshot PNG (D-11/D-12) should be visually distinct enough that screenshotting the live app would NOT produce the same image — this is the share-able artifact, not a screenshot.
- The "Request premium" mailto (D-22) should prefill subject + body with the league name and invite code so the global admin can flip it without a back-and-forth. Example: `Subject: Premium upgrade — XKQZ (Domingueros FC)`.
- The peer-prediction expansion (D-10) should sort members so the sharer (current user) appears at the top of the list, then admin, then alphabetically by nickname.

</specifics>

<deferred>
## Deferred Ideas

- League-admin-authored custom predictions (PRD §4 path 1)
- Player-suggested predictions with admin approval queue (PRD §4 path 2)
- Global admin pushing "official" predictions broadcast to all leagues (PRD §4 path 3)
- Multi-choice and numeric bonus question types
- Multiple bonus questions per match
- Per-league override of the reveal window
- Premium-only "Early Bonus Predictions" (design-spec §3 Premium Features)
- Admin-managed catalog editing UI (hybrid storage makes this trivial to add later)
- Persistent activity/notification feed (bell icon + drawer + read-state)
- Browser Push API notifications (depends on PWA infra — POLISH-01, Phase 5)
- Pre-kickoff teaser of peers' predictions (hybrid reveal model)
- Reset-scores admin tool (LEAGUE-03 PRD lists it; deferred for safety)
- Transfer-admin tool (single-admin model continues — known gap)
- Stripe / billing integration for premium tier (premium flips are manual via global admin in v1)
- "Ex-member" anonymized rows on historical leaderboards (current soft-remove just drops them)
- POST-to-`/admin`-inbox alternative to the mailto upgrade request

</deferred>

---

*Phase: 04-social-bonus-predictions*
*Context gathered: 2026-05-20*
