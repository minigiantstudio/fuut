# Fuut 2026 — Design Handoff

**Project:** Fuut 2026 — Family & friends World Cup prediction game
**Designer:** UX/UI designed in Lovable
**Status:** Prototype ready for engineering review
**Last updated:** 2026-04-19

- **Prototype (preview):** https://id-preview--9fb4a117-5a4a-48af-b0c4-bdd367e3db4d.lovable.app
- **Prototype (published):** https://fuut2026.lovable.app
- **Repository:** this repo (synced from Lovable)

---

## 1. Prototype readiness

- ✅ One clear final version is live at the published URL above.
- ✅ No experimental variants remain in the codebase. Earlier explorations (e.g. "What others predict" block in match detail) have been removed.
- ✅ The prototype covers the **main flow end-to-end**: onboarding → pick a matchday → enter prediction → (optional) bonus prediction → see ranking & results.
- ✅ Navigation is self-explanatory via the bottom tab bar (Predict / Ranking / Results / League) and the top stage navigation.

---

## 2. Scope

### MVP (in scope)
- Local onboarding with nickname (and optional email), persisted in `localStorage`.
- Predict tab: enter score predictions per match, grouped by Matchday and filterable by Group.
- Bonus prediction (Yes/No) per match for extra points.
- Ranking tab: leaderboard for the league.
- Results tab: completed matches with points earned per prediction.
- League tab: basic league context with admin toggle (admin can enter official results).
- Pixel-art retro visual identity (Press Start 2P, thick borders, limited palette).

### Out of scope (for v1)
- Real authentication (no email/password, no OAuth) — currently `localStorage` session only.
- Persistent backend / multi-device sync — no Lovable Cloud yet.
- Multiple leagues per user, invitations, or league creation flow.
- Push notifications, emails, reminders.
- "What others predict" social comparison block (intentionally hidden, kept for v2).
- Real fixture data feed — matches are mocked.
- Localization — copy is English only for now.

### Open questions
- Should the onboarding flow start with an admin-generated code followed by a simplified registration for the user?
- Should the league be single (one global "Fuut Worldcup 2026") or multi-league from day one?
- Who owns "official results" entry — one admin per league, or a panel? or data scrapping?
- How are bonus predictions scored vs. main score predictions (weighting)?
- Tiebreaker rule for the leaderboard? we suggest the extra points from the bonus predictions. 
- Do we need a public/shareable leaderboard URL?

### Risks & assumptions
- **Assumption:** Users are friends/family, low abuse risk → admin trust model is acceptable for v1.
- **Risk:** `localStorage`-only session means losing the device = losing the account. Cloud migration must happen before public launch.
- **Risk:** Fixture data must be sourced (manual entry vs. API). No provider chosen yet.
- **Assumption:** Mobile-first only — desktop is centered max-width 430px, not optimized.

---

## 3. Screen inventory

| Screen | Purpose | Entry points | Exit actions | Key reusable components |
|---|---|---|---|---|
| **Onboarding** | Capture nickname (and optional email) to create a local session | First app load with no session in `localStorage` | Submits → lands on Predict tab | `Onboarding` |
| **Predict (tab)** | Browse fixtures by stage/group and enter score predictions + bonus | Default tab after onboarding; bottom nav "Predict" | Tap row → Match Detail; tap "Enter result" (admin) → Enter Result modal | `StageNav`, `GroupFilter`, `BonusPrediction`, score input row |
| **Match Detail** | Full-screen editor for a single match prediction | Tap a non-locked, non-needs-result match card | Save → returns to Predict with status "saved"; Close → discards | `MatchDetail` |
| **Enter Result (admin modal)** | Admin enters the official final score | Admin taps "✎ Enter result" on a `needs_result` card | Confirm → match becomes `locked`; Close → no change | `EnterResult` |
| **Ranking (tab)** | Show league leaderboard with movement and points | Bottom nav "Ranking" | None (read-only) | Leaderboard row, `MovementIndicator` |
| **Results (tab)** | Show completed matchday with user's points per match | Bottom nav "Results" | None (read-only) | Result row, `PointsBadge` |
| **League (tab)** | League context + admin mode toggle | Bottom nav "League" | Toggling admin changes Predict tab capabilities; Logout clears session | `LeagueTab` |
| **Top bar** | Persistent league identity + logout | Visible on all post-onboarding screens | Logout → clears session, returns to Onboarding | `TopBar` |
| **Bottom nav** | Switch between the 4 main tabs | Persistent | Changes `activeTab` | `BottomNav`, `NavLink` |

---

## 4. User flows

### Primary flow — Predict a match
1. User opens app → if no session, sees **Onboarding**.
2. Enters nickname (email optional) → session saved → lands on **Predict** tab, default stage = Matchday 1.
3. Uses **StageNav** (horizontal scroll) to pick a matchday or knockout round.
4. (Optional) Uses **GroupFilter** to pivot to all matches of a single group across stages. A red **Clear filter** chip appears.
5. Taps a match row that is `open` or `saved` → **Match Detail** opens.
6. Adjusts home/away scores → **Save** → match status becomes `saved`, returns to list.
7. (Optional) Expands **Bonus Prediction** under the match → answers Yes/No.
8. Switches to **Ranking** or **Results** to see standings.

### Secondary flow — Admin enters official result
1. League tab → toggle admin ON.
2. Predict tab → finds a card with status `needs_result` → "✎ Enter result" button is now visible.
3. Taps it → **Enter Result** modal → enters official score → Confirm.
4. Card becomes `locked` (read-only, dimmed).

### Secondary flow — Logout
1. Top bar → **Logout** → `localStorage` session cleared → Onboarding screen.

### Edge cases
- Corrupted `localStorage` JSON → silently cleared, user sent to Onboarding.
- Empty filter result (e.g. group with no matches in current data) → "No matches found" empty card.
- Score input with non-digits or > 2 chars → rejected silently.
- Tapping a `locked` or `needs_result` card body → no-op (no detail opens).
- Switching stage while a group filter is active → group filter resets to "All".

### Broken / not-yet-built paths
- Email field collected at onboarding but **not used anywhere** (no verification, no recovery).
- Bonus prediction answers are **not persisted** between renders (component-local state).
- "League" tab admin toggle is local to the session — no real role system.
- Score predictions are **not persisted** to storage — refresh loses them.

---

## 5. UI states

| State | Where | Behavior |
|---|---|---|
| **Empty** | Predict list when filter returns 0 matches | Pixel-bordered card "No matches found" |
| **Loading** | App boot while reading `localStorage` | Centered pixel spinner on background |
| **Error** | Corrupted session | Silent recovery → Onboarding |
| **Success** | Score saved | Status badge flips to green `SAVED`; in Match Detail, modal closes |
| **Disabled** | Locked match | Card opacity 50%, inputs `disabled`, no hover/active transform |
| **Disabled** | `needs_result` match for non-admin | Inputs disabled, card not tappable |
| **Active filter** | Group filter ≠ "All" | Header subtitle changes to "Showing all Group X matches"; rows show stage + date; red "Clear filter" chip visible |
| **Mobile (default)** | All screens | Layout is mobile-first, centered, max-width 430px on larger viewports |

> Note: there is **no real network layer yet**, so no skeleton/loading states are needed inside the tabs.

---

## 6. Interaction details

- **Navigation**
  - Bottom tab bar switches main views; active tab triggers a `pixel-screen-enter` slide animation (step-end, 0.3s) — keep snappy, no easing.
  - Top stage nav is horizontally scrollable; selecting a stage resets group filter.
- **Validation**
  - Score inputs accept 0–2 digits only, regex-gated on change.
  - On blur, if both scores are filled and not locked, status auto-promotes from `open` → `saved`.
- **Modals & overlays**
  - **Match Detail**: full bottom sheet/dialog, dismiss via Close, Save commits.
  - **Enter Result** (admin): modal dialog, Confirm locks the match irreversibly (in current prototype).
  - **Bonus Prediction**: inline expand/collapse inside the card — not a modal.
- **Feedback**
  - Status badge per card: `OPEN` (gold), `SAVED` (green), `LOCKED` (muted), `RESULT?` (gold).
  - Buttons use `.pixel-press` — translate(2px,2px) + remove shadow on `:active` for the classic pixel-press feel.
- **Animation / transition**
  - All transitions use `step-end` timing to preserve the pixel aesthetic — **do not** replace with smooth easing.
  - Input focus ring uses a blinking right border (`pixel-blink` keyframes) to mimic a CRT cursor.

---

## 7. Preserve vs change

### Must preserve exactly
- **Pixel-art aesthetic**: `Press Start 2P` font, `image-rendering: pixelated`, no font smoothing, 0px border radius.
- **Color tokens** in `src/index.css` (`--pixel-green`, `--pixel-gold`, `--pixel-red`, `--pixel-blue`, etc.) — all colors must come from these HSL tokens, never hardcoded.
- **Border / shadow utilities**: `.pixel-border`, `.pixel-border-sm`, `.pixel-inset`, `.pixel-press` — these define the visual identity.
- **Step-end animations** — no smooth easing, no fade overlaps.
- **Mobile-first layout** centered at `max-w-[430px]`.
- **Top bar branding** "⚽ Chez Dupont · Group stage" structure.
- **Bottom nav** with 4 tabs in this order: Predict, Ranking, Results, League.

### Can change in implementation
- All mock data in `PredictTab.tsx`, `RankingTab.tsx`, `ResultsTab.tsx` — replace with real fixture/leaderboard data.
- `localStorage` session → migrate to Lovable Cloud auth.
- Bonus prediction questions list (currently hard-coded random) — move to data source.
- Admin toggle mechanism — replace with a proper role check (`user_roles` table + `has_role()` RPC).
- Match status state machine — currently client-side only.

### Exploratory only (do not ship as-is)
- "Bonus Prediction" scoring weight is a placeholder.
- Group filter clear-button styling (red chip) is a first pass — feel free to refine.

### Visual priorities
1. Retro pixel feel must remain instantly recognizable.
2. Readability of scores and team names (these are the primary content).
3. Status badges must be color-distinguishable and color-blind safe (we lean on labels, not color alone).

---

## 8. Assets and references

- **Copy**: English, draft. Team names, dates, and league name ("Chez Dupont") are placeholders.
- **Icons**: `lucide-react` only. Decorative glyphs (▸, ✎, ⚽, 👑, ▲, ▼) are inline Unicode — keep as text.
- **Fonts**: `Press Start 2P` (Google Fonts) loaded via `index.html`.
- **Images / logos**: none — branding is typographic.
- **Design tokens**: `src/index.css` (`:root`) and `tailwind.config.ts`.
- **External references**:
  - Visual inspiration: 8-bit / NES-era UI (limited palette, dithered).
  - shadcn/ui as the component base, themed via CSS variables.

---

## 9. Handoff package

- **Prototype link (preview):** https://id-preview--9fb4a117-5a4a-48af-b0c4-bdd367e3db4d.lovable.app
- **Prototype link (published):** https://fuut2026.lovable.app
- **Final approved version:** current `main` branch in this repository.
- **Short handoff note:**
  > Fuut 2026 is a mobile-first, pixel-art World Cup prediction game for friends and family. The current build is a high-fidelity, navigable prototype with mocked data and `localStorage` session. The next engineering milestone is wiring it to Lovable Cloud (auth, fixtures, predictions, scoring) without breaking the pixel aesthetic defined in `src/index.css`.

### Questions for architecture
- Lovable Cloud schema: `profiles`, `leagues`, `league_members`, `matches`, `predictions`, `bonus_questions`, `bonus_predictions`, `user_roles`?
- How do we ingest fixtures (manual admin tool vs. third-party API)?
- Scoring engine: client-side derive vs. server-side function on result entry?
- Realtime ranking updates — needed for v1 or polling is fine?

### Questions for engineering
- Do we keep the 4-tab structure or collapse Results into Ranking?
- Refactor target for `PredictTab.tsx` (currently 254 lines) — split into `MatchCard`, `MatchList`, and a `usePredictions` hook?
- Which match statuses should be derived vs. stored (`open`, `saved`, `locked`, `needs_result`)?
- Are we OK with `Press Start 2P` performance on low-end devices, or do we need a fallback?

---

## 10. Review session

- [ ] Walkthrough meeting scheduled with designer + architect + engineering lead.
- [ ] Designer available for follow-up questions in Slack `#fuut2026`.
- [ ] Architect confirms Cloud schema and scoring approach.
- [ ] Engineers confirm refactor plan for `PredictTab.tsx` and state persistence.
- [ ] Hand-off approved before build of v1 starts.

---

## Minimum deliverable (recap)

- **Prototype link:** see §9
- **Screen list:** see §3
- **Main flow:** see §4 ("Predict a match")
- **States:** see §5
- **Preserve vs change notes:** see §7
- **Open questions:** see §2 + §9
