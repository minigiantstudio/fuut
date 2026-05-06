# Phase 2: League & Prediction Core - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 12
**Analogs found:** 11 / 12

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/web/src/contexts/SessionContext.tsx` | provider | request-response | self (refactor) | exact |
| `apps/web/src/components/Onboarding.tsx` | component | request-response | self (refactor) | exact |
| `apps/web/src/components/TopBar.tsx` | component | event-driven | self (refactor) | exact |
| `apps/web/src/components/LeagueSwitcher.tsx` | component | event-driven | `apps/web/src/components/TopBar.tsx` | role-match |
| `apps/web/src/components/tabs/LeagueTab.tsx` | component | CRUD | self (refactor) | exact |
| `apps/web/src/components/tabs/PredictTab.tsx` | component | CRUD | self (refactor) | exact |
| `apps/web/src/pages/Join.tsx` | component | request-response | self (refactor) | exact |
| `supabase/migrations/20260504000001_phase2_league.sql` | migration | CRUD | `supabase/migrations/20260401000000_init_schema.sql` | role-match |
| `apps/web/tests/league-create.spec.ts` | test | request-response | `apps/web/tests/auth.spec.ts` | exact |
| `apps/web/tests/multi-league.spec.ts` | test | request-response | `apps/web/tests/auth.spec.ts` | exact |
| `apps/web/tests/predict-countdown.spec.ts` | test | request-response | `apps/web/tests/auth.spec.ts` | exact |
| `apps/web/tests/helpers/mock-routes.ts` | utility | request-response | self (refactor) | exact |

---

## Pattern Assignments

### `apps/web/src/contexts/SessionContext.tsx` (provider, request-response)

**Analog:** self — full file read at `/Users/kashell/Development/Saul/fuut/apps/web/src/contexts/SessionContext.tsx`

**Imports pattern** (lines 1-3):
```typescript
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@/lib/supabase/types";
```
Add no new imports. New `LeagueSummary` interface and the updated `SessionContextValue` go in this file.

**Current interface to extend** (lines 5-9):
```typescript
interface SessionContextValue {
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}
```
Extend to:
```typescript
interface SessionContextValue {
  session: Session | null;    // active league — shape unchanged
  leagues: LeagueSummary[];   // all memberships
  loading: boolean;
  refreshSession: () => Promise<void>;
  setActiveLeague: (leagueId: string) => void;
}
```

**Core pattern to replace** (lines 41-55) — the single `.maybeSingle()` query:
```typescript
// CURRENT (single membership):
const { data: membership } = await supabase
  .from("league_members")
  .select("*, leagues(id, name)")
  .eq("user_id", user.id)
  .maybeSingle();

if (!membership || !membership.leagues) return null;

return {
  userId: user.id,
  nickname: dbUser.nickname,
  leagueId: (membership.leagues as { id: string; name: string }).id,
  leagueName: (membership.leagues as { id: string; name: string }).name,
  role: membership.role,
};
```
Replace with an array query and return both `leagues` array and `activeLeague` as `Session`.

**Auth state listener pattern** (lines 75-84) — preserve exactly:
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
  if (event === "SIGNED_OUT") {
    setSession(null);
  } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    const s = await loadSession();
    setSession(s);
  }
});
return () => subscription.unsubscribe();
```

**Provider return** (lines 87-92) — extend the value object only:
```typescript
return (
  <SessionContext.Provider value={{ session, loading, refreshSession }}>
    {children}
  </SessionContext.Provider>
);
```
Change to `{ session, leagues, loading, refreshSession, setActiveLeague }`.

**Active league persistence pattern** — add before the return in `loadSession`:
```typescript
// Read persisted active league from localStorage, fall back to first membership
const persisted = localStorage.getItem("activeLeagueId");
const active = leagues.find((l) => l.leagueId === persisted) ?? leagues[0] ?? null;
```
Persist on `setActiveLeague`:
```typescript
const setActiveLeague = useCallback((leagueId: string) => {
  localStorage.setItem("activeLeagueId", leagueId);
  // recompute session from leagues array — no new network call needed
}, [leagues]);
```

---

### `apps/web/src/components/Onboarding.tsx` (component, request-response)

**Analog:** self — full file read at `/Users/kashell/Development/Saul/fuut/apps/web/src/components/Onboarding.tsx`

**Imports pattern** (lines 1-4) — unchanged:
```typescript
import { useState } from "react";
import trophyIcon from "@/assets/trophy.png";
import { supabase } from "@/lib/supabase/client";
import { useSession } from "@/contexts/SessionContext";
```

**Step type extension** (line 19) — current:
```typescript
const [step, setStep] = useState<1 | 2 | 3 | 4 | "recovery">(1);
```
Extend to:
```typescript
const [step, setStep] = useState<
  1 | 2 | 3 | 4 | "recovery" |
  "create-name" | "create-nickname" | "create-email" | "create-confirm"
>(1);
```

**New state for create path** — add after line 28 alongside existing state:
```typescript
const [newLeagueName, setNewLeagueName] = useState("");
const [createdLeagueId, setCreatedLeagueId] = useState<string | null>(null);
const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
```

**RPC call pattern** (line 37-39) — existing `validateCode` as the model:
```typescript
const { data, error } = await supabase.rpc("lookup_league_by_invite_code", {
  p_code: inviteCode.trim().toUpperCase(),
});
const league = Array.isArray(data) ? data[0] : data;
```
The new `handleCreate` follows the same pattern:
```typescript
const { data, error } = await supabase.rpc("create_league", {
  p_name: newLeagueName.trim(),
  p_user_id: userId,
});
if (error || !data?.[0]) throw new Error(error?.message ?? "Failed to create league");
const { id: leagueId, invite_code: inviteCode } = data[0];
```

**Auth + insert + refresh pattern** (lines 52-85) — `handleComplete` is the model for `handleCreate`:
```typescript
// 1. signInAnonymously (same as handleComplete lines 58-60)
const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
if (authError || !authData.user) throw new Error(authError?.message ?? "Auth failed");
const userId = authData.user.id;

// 2. Insert user row — email is REQUIRED for creator (unlike join, where it's optional)
const { error: userErr } = await supabase.from("users").insert({
  id: userId,
  nickname: nickname.trim(),
  email: email.trim(),          // mandatory — validated before this point
});
if (userErr) throw new Error(userErr.message);

// 3. Call create_league RPC (league + admin member inserted atomically in DB)
// ... (see RPC call pattern above)

// 4. Store invite code for confirmation screen — don't wait for refreshSession
setCreatedLeagueId(leagueId);
setCreatedInviteCode(inviteCode);
setStep("create-confirm");
await refreshSession();         // background — confirmation already shown
```

**Step 1 fork point** — add a second CTA button below the existing "Join league" button (line 138), matching the existing button's `pixel-border` style:
```typescript
<button
  onClick={() => setStep("create-name")}
  className="w-full h-12 pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-pixel-blue"
>
  Create a league
</button>
```

**Invite code display on confirmation screen** — copy the exact style from `LeagueTab.tsx` invite code card (line 80):
```tsx
<span className="text-[14px] tracking-[0.3em] text-foreground">{createdInviteCode}</span>
```

**Error handling pattern** (line 80-81, 309) — all steps:
```typescript
{joinError && <p className="text-[6px] text-pixel-red text-center">{joinError}</p>}
```

---

### `apps/web/src/components/TopBar.tsx` (component, event-driven)

**Analog:** self — full file read at `/Users/kashell/Development/Saul/fuut/apps/web/src/components/TopBar.tsx`

**Current props interface** (lines 1-5):
```typescript
interface TopBarProps {
  onLogout?: () => void;
  leagueName?: string;
  nickname?: string;
}
```
Extend to add:
```typescript
  onLeagueSwitch?: () => void;   // opens LeagueSwitcher
  hasMultipleLeagues?: boolean;  // controls whether chevron/trigger is shown
```

**Current league name display** (line 14) — becomes the switcher trigger:
```typescript
// CURRENT (passive):
<span className="text-[10px] font-bold text-accent">⚽ {leagueName}</span>

// NEW (interactive when hasMultipleLeagues):
{hasMultipleLeagues ? (
  <button
    onClick={onLeagueSwitch}
    className="flex items-center gap-1 text-[10px] font-bold text-accent"
  >
    ⚽ {leagueName} <span className="text-[7px]">▾</span>
  </button>
) : (
  <span className="text-[10px] font-bold text-accent">⚽ {leagueName}</span>
)}
```

**Overall header structure** (lines 10-33) — preserve exactly; only the league name span changes.

---

### `apps/web/src/components/LeagueSwitcher.tsx` (component, event-driven)

**Analog:** `apps/web/src/components/TopBar.tsx` (role-match: interactive UI component receiving session context data)

**Imports pattern** — copy from TopBar plus shadcn/ui dialog or dropdown:
```typescript
import { useSession } from "@/contexts/SessionContext";
```
Pick `shadcn/ui` `dropdown-menu.tsx` or `drawer.tsx` — both are installed.

**Session data access pattern** — copy from `apps/web/src/pages/Index.tsx` (line 13):
```typescript
const { session, leagues, setActiveLeague } = useSession();
```

**League list render** — each entry uses the `pixel-border`, `bg-card` classes and the same `p-3` / `py-2.5` spacing seen in `LeagueTab.tsx` member list (lines 96-109):
```tsx
<div className="pixel-border bg-card divide-y-2 divide-foreground">
  {leagues.map((l) => (
    <button
      key={l.leagueId}
      onClick={() => { setActiveLeague(l.leagueId); onClose(); }}
      className="flex items-center gap-3 px-3 py-2.5 w-full text-left"
    >
      <span className="text-xs text-foreground flex-1">{l.leagueName}</span>
      {l.leagueId === session?.leagueId && (
        <span className="text-[6px] px-2 py-0.5 bg-pixel-green text-primary-foreground border-2 border-foreground">
          ACTIVE
        </span>
      )}
    </button>
  ))}
</div>
```

**Prop interface:**
```typescript
interface LeagueSwitcherProps {
  open: boolean;
  onClose: () => void;
}
```

---

### `apps/web/src/components/tabs/LeagueTab.tsx` (component, CRUD)

**Analog:** self — full file read at `/Users/kashell/Development/Saul/fuut/apps/web/src/components/tabs/LeagueTab.tsx`

**RPC mutation pattern** (lines 55-62) — `handleShare` is the model for `handleRegenerate`:
```typescript
const handleShare = async () => {
  const url = `${window.location.origin}/join/${league?.invite_code}`;
  if (navigator.share) {
    await navigator.share({ title: session.leagueName, text: `Join ${session.leagueName}!`, url });
  } else {
    await navigator.clipboard.writeText(url);
  }
};
```
New handler pattern:
```typescript
const handleRegenerate = async () => {
  // Confirmation dialog guards this call (D-05)
  const { data, error } = await supabase.rpc("regenerate_invite_code", {
    p_league_id: session.leagueId,
  });
  if (!error) {
    queryClient.invalidateQueries({ queryKey: ["league", session.leagueId] });
  }
};
```
`useQueryClient` is already imported in `PredictTab.tsx` (line 2) — add same import to `LeagueTab.tsx`.

**Admin section** (lines 115-124) — add the regenerate button inside the existing admin block:
```tsx
{isAdmin && (
  <div className="space-y-2">
    <h2 className="text-[8px] text-foreground">⚙ Manage</h2>
    <div className="pixel-border bg-card divide-y-2 divide-foreground">
      <button className="flex items-center gap-3 px-3 py-2.5 w-full text-left">
        <span className="text-foreground text-xs">✎ Rename league</span>
      </button>
      {/* NEW: regenerate code button */}
      <button
        onClick={() => setConfirmRegenOpen(true)}
        className="flex items-center gap-3 px-3 py-2.5 w-full text-left"
      >
        <span className="text-foreground text-xs">🔄 Regenerate invite code</span>
      </button>
    </div>
  </div>
)}
```

**Confirmation dialog** — use `shadcn/ui dialog.tsx`, already installed. Use same `pixel-border` aesthetic for the dialog content panel.

**Query pattern** (lines 31-53) — `useQuery` with `queryKey: ["league", session.leagueId]` is the cache key to invalidate after regeneration.

---

### `apps/web/src/components/tabs/PredictTab.tsx` (component, CRUD)

**Analog:** self — full file read at `/Users/kashell/Development/Saul/fuut/apps/web/src/components/tabs/PredictTab.tsx`

**Imports extension** (line 1) — add `useEffect` and `useRef` if not already present (both are currently absent — `useRef` is present but `useEffect` is not):
```typescript
import { useState, useRef, useMemo, useEffect } from "react";
```

**Tick state for countdown refresh** — add alongside existing state declarations (lines 32-37):
```typescript
const [tick, setTick] = useState(0);
```
Then add a `useEffect` after existing state:
```typescript
useEffect(() => {
  const id = setInterval(() => setTick((t) => t + 1), 60_000);
  return () => clearInterval(id);
}, []);
```

**matches useMemo dependency** (lines 70-86) — add `tick` as a dependency so countdown re-evaluates:
```typescript
const matches: MatchWithStatus[] = useMemo(() => {
  // ... existing logic unchanged ...
}, [rawMatches, predictionMap, tick]);  // add tick here
```

**Countdown label injection** — insert after line 214 (the kickoff date/time span), inside the date/time row:
```tsx
<div className="flex items-center justify-between">
  <span className="text-[6px] text-muted-foreground font-mono">
    {new Date(match.kickoff_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ·{" "}
    {new Date(match.kickoff_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
  </span>
  {/* NEW: countdown label on OPEN matches within 24h */}
  {match.uiStatus === "open" && (() => {
    const diff = new Date(match.kickoff_at).getTime() - Date.now();
    if (diff <= 0 || diff > 86_400_000) return null;
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const label = h > 0 ? `Locks in ${h}h ${m}m` : `Locks in ${m}m`;
    return <span className="text-[6px] text-pixel-red">{label}</span>;
  })()}
  {/* existing admin Enter result button stays here */}
</div>
```

---

### `apps/web/src/pages/Join.tsx` (component, request-response)

**Analog:** self — full file read at `/Users/kashell/Development/Saul/fuut/apps/web/src/pages/Join.tsx`

**Current auth redirect** (lines 11-15) — the pitfall:
```typescript
useEffect(() => {
  if (!loading && session) {
    navigate("/", { replace: true });   // silently drops the join code — WRONG
  }
}, [session, loading, navigate]);
```
Replace with a guard that renders an "Add this league?" confirmation UI instead of redirecting.

**Updated imports** — add `useState`:
```typescript
import { useEffect, useState } from "react";
```

**New pattern** — when `session` exists, show an inline confirmation:
```typescript
// In component body, after existing state/hooks:
const [joining, setJoining] = useState(false);
const [joinError, setJoinError] = useState<string | null>(null);
const [leaguePreview, setLeaguePreview] = useState<{ id: string; name: string } | null>(null);

// Replace the redirect useEffect with a lookup effect:
useEffect(() => {
  if (!loading && session && code) {
    // Don't redirect — look up the league so we can show a confirmation
    supabase.rpc("lookup_league_by_invite_code", { p_code: code.toUpperCase() })
      .then(({ data }) => {
        const league = Array.isArray(data) ? data[0] : data;
        if (league?.id) setLeaguePreview(league);
        else navigate("/", { replace: true });
      });
  }
}, [session, loading, code, navigate]);
```

**Join action** — insert directly into `league_members` without re-auth, mirroring `handleComplete` in `Onboarding.tsx` (lines 71-75):
```typescript
const handleAddLeague = async () => {
  if (!leaguePreview || !session) return;
  setJoining(true);
  const { error } = await supabase.from("league_members").insert({
    user_id: session.userId,
    league_id: leaguePreview.id,
    role: "member",
  });
  if (error) { setJoinError(error.message); setJoining(false); return; }
  await refreshSession();
  navigate("/", { replace: true });
};
```

**Loading spinner** (lines 17-22) — preserve exactly. Reuse for the joining state too.

---

### `supabase/migrations/20260504000001_phase2_league.sql` (migration, CRUD)

**Analog:** `supabase/migrations/20260401000000_init_schema.sql` (role-match: same SQL migration structure)

**File structure pattern** from analog:
```sql
-- Section comment
CREATE OR REPLACE FUNCTION ...
RETURNS ... LANGUAGE plpgsql SECURITY DEFINER AS $$
...
$$;

-- Trigger / constraint section
ALTER TABLE ...;
```

**UNIQUE constraint pattern** — idempotent form (Pitfall 5):
```sql
ALTER TABLE leagues
  ADD CONSTRAINT IF NOT EXISTS leagues_invite_code_key UNIQUE (invite_code);
```

**RPC structure pattern** — extrapolated from `lookup_league_by_invite_code` (known to exist and work):
```sql
CREATE OR REPLACE FUNCTION create_league(p_name text, p_user_id uuid)
RETURNS TABLE(id uuid, invite_code text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code text;
  v_id   uuid;
  v_tries int := 0;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text) FROM 1 FOR 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM leagues l WHERE l.invite_code = v_code);
    v_tries := v_tries + 1;
    IF v_tries > 10 THEN RAISE EXCEPTION 'Could not generate unique invite code'; END IF;
  END LOOP;
  INSERT INTO leagues(name, invite_code, created_by)
    VALUES (p_name, v_code, p_user_id)
    RETURNING leagues.id INTO v_id;
  INSERT INTO league_members(league_id, user_id, role)
    VALUES (v_id, p_user_id, 'admin');
  RETURN QUERY SELECT v_id, v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION create_league(text, uuid) TO authenticated;
```

```sql
CREATE OR REPLACE FUNCTION regenerate_invite_code(p_league_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_code text;
  v_tries int := 0;
BEGIN
  LOOP
    v_code := upper(substring(md5(random()::text) FROM 1 FOR 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM leagues l WHERE l.invite_code = v_code);
    v_tries := v_tries + 1;
    IF v_tries > 10 THEN RAISE EXCEPTION 'Could not generate unique invite code'; END IF;
  END LOOP;
  UPDATE leagues SET invite_code = v_code WHERE id = p_league_id;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION regenerate_invite_code(uuid) TO authenticated;
```

---

### `apps/web/tests/league-create.spec.ts` (test, request-response)

**Analog:** `apps/web/tests/auth.spec.ts` — exact match: same Playwright test structure, same `test` fixture from `mock-routes.ts`.

**File structure pattern** (auth.spec.ts lines 1-44):
```typescript
import { test, expect, MOCK_INVITE_CODE } from "./helpers/mock-routes";

test.describe("League creation", () => {
  test("step 1 shows 'Create a league' button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Create a league/i })).toBeVisible();
  });

  test("create flow: name → nickname → email → confirm screen with code", async ({ page }) => {
    await page.goto("/");
    // ...
  });
});
```

**Mock registration pattern** — new RPCs are registered with `page.route` before `page.goto`, following mock-routes.ts lines 41-52:
```typescript
await page.route(
  `${SUPABASE_URL}/rest/v1/rpc/create_league`,
  async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "bbbbbbbb-0000-0000-0000-000000000002", invite_code: "XKQZ" }]),
    });
  }
);
```

---

### `apps/web/tests/multi-league.spec.ts` (test, request-response)

**Analog:** `apps/web/tests/auth.spec.ts` — exact match.

**Session mock extension needed** — mock `league_members` to return an array (not a single row) so SessionContext exercises the multi-league path. Pattern from mock-routes.ts generic fallback (lines 14-19):
```typescript
await page.route(`${SUPABASE_URL}/rest/v1/league_members*`, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([
      { id: "m1", user_id: "u1", league_id: "l1", role: "admin", joined_at: "2026-01-01",
        leagues: { id: "l1", name: "Alpha League" } },
      { id: "m2", user_id: "u1", league_id: "l2", role: "member", joined_at: "2026-02-01",
        leagues: { id: "l2", name: "Beta League" } },
    ]),
  });
});
```

---

### `apps/web/tests/predict-countdown.spec.ts` (test, request-response)

**Analog:** `apps/web/tests/auth.spec.ts` — exact match.

**Time-sensitive mock pattern** — the mock for `matches` must return a `kickoff_at` that is less than 24 hours from "now". Since tests run against a mocked server, inject a kickoff time relative to `Date.now()`:
```typescript
const soonKickoff = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h from now
await page.route(`${SUPABASE_URL}/rest/v1/matches*`, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{
      id: "m1", home_team: "Brazil", away_team: "France",
      kickoff_at: soonKickoff, stage: "Matchday 1",
      group_name: "A", home_score: null, away_score: null, is_final: false,
    }]),
  });
});
```

---

### `apps/web/tests/helpers/mock-routes.ts` (utility, request-response)

**Analog:** self — full file read at `/Users/kashell/Development/Saul/fuut/apps/web/tests/helpers/mock-routes.ts`

**Existing export pattern** (lines 6-10, 55-65) — preserve exactly:
```typescript
export const MOCK_INVITE_CODE = "TEST1";
export const MOCK_LEAGUE = { id: "...", name: "Test League" };
export const test = base.extend<{ mockSupabase: void }>({ ... });
export { expect };
```

**Add new exports** alongside existing constants:
```typescript
export const MOCK_CREATED_LEAGUE = {
  id: "bbbbbbbb-0000-0000-0000-000000000002",
  invite_code: "XKQZ",
  name: "My New League",
};
```

**New route registrations** — add inside `setupSupabaseMocks` after the existing `lookup_league_by_invite_code` route (line 41). Playwright applies routes in registration order; more specific routes registered later take priority:
```typescript
// create_league RPC mock
await page.route(
  `${SUPABASE_URL}/rest/v1/rpc/create_league`,
  async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: MOCK_CREATED_LEAGUE.id, invite_code: MOCK_CREATED_LEAGUE.invite_code }]),
    });
  }
);

// regenerate_invite_code RPC mock
await page.route(
  `${SUPABASE_URL}/rest/v1/rpc/regenerate_invite_code`,
  async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify("NEWC"),
    });
  }
);

// leagues REST mock (invite code display in LeagueTab)
await page.route(`${SUPABASE_URL}/rest/v1/leagues*`, async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{ id: MOCK_LEAGUE.id, invite_code: MOCK_INVITE_CODE, name: MOCK_LEAGUE.name }]),
  });
});
```

---

## Shared Patterns

### Supabase RPC call
**Source:** `apps/web/src/components/Onboarding.tsx` lines 37-43
**Apply to:** All files that call Supabase RPCs (`Onboarding.tsx` create path, `LeagueTab.tsx` regenerate, `Join.tsx` lookup)
```typescript
const { data, error } = await supabase.rpc("rpc_name", { param: value });
const result = Array.isArray(data) ? data[0] : data;
if (error || !result) throw new Error(error?.message ?? "RPC failed");
```

### useQuery data fetching
**Source:** `apps/web/src/components/tabs/LeagueTab.tsx` lines 31-53 and `PredictTab.tsx` lines 39-62
**Apply to:** Any new component reading from Supabase tables
```typescript
const { data: items = [], isLoading } = useQuery<ItemType[]>({
  queryKey: ["key", session.leagueId],
  queryFn: async () => {
    const { data, error } = await supabase.from("table").select("*").eq("league_id", session.leagueId);
    if (error) throw error;
    return data ?? [];
  },
});
```

### queryClient cache invalidation after mutation
**Source:** `apps/web/src/components/tabs/PredictTab.tsx` lines 119-129
**Apply to:** `LeagueTab.tsx` handleRegenerate, `Join.tsx` handleAddLeague (via refreshSession)
```typescript
queryClient.invalidateQueries({ queryKey: ["key", session.leagueId] });
```

### Error display
**Source:** `apps/web/src/components/Onboarding.tsx` lines 129-131, 281, 309
**Apply to:** All new interactive UI (create form, join confirmation, regenerate button)
```tsx
{error && <p className="text-[6px] text-pixel-red text-center">{error}</p>}
```

### Loading spinner
**Source:** `apps/web/src/pages/Join.tsx` lines 17-22 and `apps/web/src/pages/Index.tsx` lines 21-25
**Apply to:** Any async gate screen
```tsx
<div className="min-h-screen bg-background flex items-center justify-center">
  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
</div>
```

### Pixel UI classes
**Source:** throughout `Onboarding.tsx`, `LeagueTab.tsx`, `PredictTab.tsx`
**Apply to:** All new UI surfaces
- Container: `pixel-border bg-card p-4`
- Input: `pixel-inset bg-card px-4`
- Primary button: `pixel-border text-primary-foreground text-[8px] uppercase tracking-wider active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all`
- Invite code display: `text-[14px] tracking-[0.3em] text-foreground`
- Muted label: `text-[6px] text-muted-foreground`
- Error text: `text-[6px] text-pixel-red`

### Playwright test structure
**Source:** `apps/web/tests/auth.spec.ts` lines 1-44
**Apply to:** All three new test files
```typescript
import { test, expect } from "./helpers/mock-routes";

test.describe("Feature name", () => {
  test("assertion description", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /pattern/i })).toBeVisible();
  });
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `supabase/migrations/20260504000001_phase2_league.sql` | migration | CRUD | The analog migration (`20260401000000_init_schema.sql`) covers a different schema era and does not contain `leagues`, `league_members`, or any RPC definitions. The live DB schema is the true baseline (from `packages/types/src/database.types.ts`). SQL structure is extrapolated from the RESEARCH.md ASSUMED pattern for `create_league`. |

---

## Metadata

**Analog search scope:** `apps/web/src/`, `apps/web/tests/`, `supabase/migrations/`
**Files scanned:** 13 (SessionContext, Onboarding, TopBar, LeagueTab, PredictTab, Join, Index, AppLayout, types.ts, auth.spec.ts, mock-routes.ts, init_schema.sql, database.types.ts)
**Pattern extraction date:** 2026-05-05
