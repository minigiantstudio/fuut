# Phase 4: Social & Bonus Predictions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `04-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-20 (resumed across 2026-05-19 + 2026-05-20)
**Phase:** 04-social-bonus-predictions
**Areas discussed:** Custom Micro-Predictions (SOCIAL-01), Sharing & Snapshots (SOCIAL-03), Engagement Signals (SOCIAL-02 + SOCIAL-04), League Admin & Limits (LEAGUE-03 + LEAGUE-04)

> First two areas captured on 2026-05-19 (interrupted before CONTEXT.md was written). Resumed 2026-05-20 from `04-DISCUSS-CHECKPOINT.json` and completed the remaining two areas.

---

## Custom Micro-Predictions (SOCIAL-01)

### Data model / authoring shape

| Option | Description | Selected |
|--------|-------------|----------|
| New `custom_predictions` table league-scoped | Per-league authoring; each league has its own custom set | |
| Extend `matches.bonus_question` to multiple | Multi-row bonus per match, still tournament-wide | |
| Hybrid match + tournament-wide | Curated global catalog + room for league custom | ✓ (curated only, no league custom v1) |

**User's choice:** Curated tournament-wide catalog of yes/no events. No per-league custom predictions in v1.
**Notes:** User pivoted from admin-authored to curated-catalog model. Catalog ships once at seed time; admin only resolves.

### Authoring paths in v1

| Option | Description | Selected |
|--------|-------------|----------|
| League admin creates | Each league admin writes their own bonus questions | |
| Players suggest → admin approves | Crowd-sourced with moderation queue | |
| Global admin pushes official | Single global authoring path | ✓ (catalog fixed at seed; admin only resolves) |

**User's choice:** Admin authoring deferred. Catalog is fixed at seed time. Admin only resolves (final score + bonus answer).

### Point value

| Option | Description | Selected |
|--------|-------------|----------|
| Admin-defined 1-10 | Per-question variable point value | |
| Fixed +2 | Inherits Phase 3 D-04 | ✓ |
| Three-tier preset (easy/medium/hard) | Static tiers | |

**User's choice:** Fixed +2 points.

### Where users answer custom predictions

| Option | Description | Selected |
|--------|-------------|----------|
| New "Bonus" bottom-nav tab | 5th tab dedicated to bonus | |
| Expand PredictTab inline | Bonus lives on the match it belongs to | ✓ |
| On Ranking tab | Bonus answers under leaderboard | |

**User's choice:** Inline on PredictTab match cards. No new bottom-nav tab.

### Question type

| Option | Description | Selected |
|--------|-------------|----------|
| Yes/No only | Single-binary | ✓ |
| Yes/No + multi-choice | Two interaction types | |
| Yes/No + multi-choice + numeric | Three interaction types | |

**User's choice:** Yes/No only in v1.

### Reveal timing

| Option | Description | Selected |
|--------|-------------|----------|
| 1 hour fixed | Hardcoded 60 min before kickoff | |
| 30 min fixed | Hardcoded 30 min before kickoff | |
| Per-league configurable | Each league sets its own window | |
| Tournament-uniform constant in config table | Configurable globally, computed at read time | ✓ (default 60 min, admin-editable) |

**User's choice:** Configurable global setting, default 60 min before kickoff, editable from global `/admin` route.
**Notes:** User requested admin-configurable with 1h default. Per-league overrides deferred.

### Pre-reveal UI

| Option | Description | Selected |
|--------|-------------|----------|
| Locked placeholder + countdown | `🔒 Surprise bonus reveals in Xh Ym` | ✓ |
| Nothing — appears at reveal | Card has no bonus slot until reveal time | |
| Teaser (category only) | Shows the question category but not the prompt | |

**User's choice:** Locked placeholder card with countdown. Mirrors Phase 2 D-09 vocabulary. Question text redacted via RLS/RPC until reveal time.

### Catalog storage

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded TS → seed `matches.bonus_question` | Catalog lives only in source code | |
| New `bonus_question_catalog` table + FK | DB-only catalog | |
| Hybrid | TS catalog seeds DB on migration | ✓ |

**User's choice:** Hybrid — TS catalog file seeds a new `bonus_question_catalog` table on migration; DB becomes source of truth.

### Bonus questions per match

| Option | Description | Selected |
|--------|-------------|----------|
| One per match | Current schema preserved | ✓ |
| Up to 3 via `match_bonus_questions` join | Multi-row bonus per match | |

**User's choice:** One per match.

---

## Sharing & Snapshots (SOCIAL-03)

### What gets shared — image, URL, or both?

| Option | Description | Selected |
|--------|-------------|----------|
| Image + auto-link to public snapshot page | Both, with OG meta for previews | ✓ |
| Image only — no URL | Pixel-art PNG, no landing page | |
| URL only — no image generation | Just a link | |

**User's choice:** Image + auto-link. Pixel-art PNG via `html-to-image` AND short public URL `/s/<token>` with OG meta tags.

### Snapshot content layout

| Option | Description | Selected |
|--------|-------------|----------|
| Top-3 podium + "You" card + last-matchday recap | Story-driven, scales for any league size | ✓ |
| Full leaderboard | All members rendered | |
| Sharer's choice toggle | UI toggle before share | |

**User's choice:** Top-3 podium + "You" card + last-matchday recap. Sharer always sees themselves on the snapshot.

### Distribution channel

| Option | Description | Selected |
|--------|-------------|----------|
| Web Share API + explicit fallback buttons | Native sheet on mobile, explicit buttons on desktop | ✓ |
| Explicit WhatsApp + Telegram only | No Web Share API | |
| Web Share API only | No fallback for desktop | |

**User's choice:** Web Share API with explicit fallback buttons.

### Public snapshot page access model

| Option | Description | Selected |
|--------|-------------|----------|
| Tokenized URL, 30-day expiry | Short-lived shares | |
| Tokenized URL, never expires | Permanent shareable artifacts | ✓ |
| League invite code as URL (live leaderboard) | Shows live data, not a snapshot | |

**User's choice:** Tokenized URL, never expires. `snapshot_tokens(token, league_id, snapshot_payload jsonb, created_by, created_at)` — payload is a frozen copy.

---

## Engagement Signals (SOCIAL-02 + SOCIAL-04)

### When do other users' predictions for a match become visible?

| Option | Description | Selected |
|--------|-------------|----------|
| At kickoff (LOCKED) | Visible the moment the match locks | |
| After final whistle (SCORED) | Visible only after the match is scored | ✓ |
| Hybrid: own + top-3 at kickoff, full reveal at scored | Two-stage reveal | |

**User's choice:** After final whistle (SCORED). Preserves suspense through the live match window.

### Where do others' predictions appear in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline expansion on PredictTab match cards | Tap a SCORED card to reveal | ✓ |
| On ResultsTab next to actual score | On the post-match recap surface | |
| New dedicated "Predictions" or "Pulse" tab | 5th bottom-nav tab | |

**User's choice:** Inline expansion on PredictTab match cards. Mirrors SOCIAL-01 inline-bonus pattern.

### What in-app scoring feedback should users get (SOCIAL-04)?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast on every match scored + RankingTab realtime update | Reuse Sonner + Phase 3 realtime channel | ✓ |
| Toast only on YOUR rank change | Quieter, fewer pings | |
| Toast + persistent activity feed (new bell/badge) | New notifications table | |

**User's choice:** Toast on every match scored + RankingTab realtime update. Toast copy: `Match X scored — you earned Y pts (#N ↑/↓)`.

### Persistent notification feed in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| No — toasts only, ephemeral | No new table, no read-state | ✓ |
| Yes — new activity drawer with unread badge | Notifications table + bell icon | |
| Yes — but only as a section inside RankingTab | Append "Recent activity" list | |

**User's choice:** No persistent feed in v1. Activity feed deferred as v2.

---

## League Admin & Limits (LEAGUE-03 + LEAGUE-04)

### Which LEAGUE-03 admin tools ship in Phase 4?

| Option | Description | Selected |
|--------|-------------|----------|
| Rename league | Edit `leagues.name` | ✓ |
| Remove members | Kick a member via new RPC | ✓ |
| Reset scores | Zero out all predictions/points | |
| Transfer admin to another member | Safety hatch for single-admin model | |

**User's choice:** Rename league + remove members. Reset scores and transfer admin both deferred.

### Where does the admin UI live and how is it invoked?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline icons on member rows + edit-name pencil in LeagueTab header | Visible affordance, no new screens | ✓ |
| New "Manage league" sub-screen reached from LeagueTab | Dedicated route | |
| Bottom-sheet "Manage" drawer on long-press of league name | Hidden affordance | |

**User's choice:** Inline icons on member rows + edit-name pencil in LeagueTab header.

### What happens to a removed member's predictions and rank?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft remove — delete `league_members` row, keep predictions | Orphaned but reversible | ✓ |
| Hard remove — cascade delete predictions for this league | Cleaner, irreversible | |
| Soft remove + "Ex-member" anonymized on leaderboard | Adds flag on `league_members` | |

**User's choice:** Soft remove. Member disappears from leaderboard; predictions stay as orphan rows.

### Free vs Premium size limits (LEAGUE-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Free = 8 members, Premium = unlimited; tier flipped manually | Hard-coded 8, manual flip | |
| Free = 6, Premium = 50 (per design-spec.md) | Tighter free cap, finite premium cap | |
| Free = unlimited; defer LEAGUE-04 entirely | No enforcement v1 | |
| Free = N (TBD), enforced via env var or feature flag | Env-var configurable | ✓ (initial pick) |

**User's choice (initial):** Env-var configurable cap.

### Free-cap default value + join-blocked UX (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| Default 8 + "League full" toast on /join, no waitlist | Cheapest UX | (initial recommend) |
| Default 6 + same "League full" toast | Tighter cap, harder upgrade nudge | |
| Default 10 + "League full" toast | Looser cap, fewer leagues hit it organically | |
| Default 10 + show admin a "Request premium" button that emails global admin | Looser cap + smoother upgrade path | ✓ (final, after user override) |

**User's choice (final, after override):** Default `LEAGUE_FREE_MAX_MEMBERS=10`. "League full" toast on `/join`. Admin sees "Request premium" affordance — a `mailto:<ADMIN_CONTACT_EMAIL>` link prefilled with league name + invite code.
**Notes:** User initially picked the env-var-configurable option, then overrode the default value and surface UX in a follow-up. Both intents combined: env-var mechanism, default 10, mailto upgrade affordance.

---

## Claude's Discretion

- Exact pixel-art layout of the snapshot PNG (subject to UI-SPEC pass)
- Exact migration shape for `bonus_question_catalog`, `snapshot_tokens`, `app_config`, and the `leagues.tier` column
- Whether peer predictions for SCORED matches are fetched eagerly or lazily
- Exact RLS / RPC strategy that redacts pre-reveal bonus question text
- Whether the global-admin "Flip to premium" action is a button row in the existing match-result-entry table or a new section in `/admin`

## Deferred Ideas

See `04-CONTEXT.md` `<deferred>` section for the canonical list.
