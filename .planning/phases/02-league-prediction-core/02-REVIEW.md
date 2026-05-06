---
phase: 02-league-prediction-core
reviewed: 2026-05-06T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - apps/web/src/components/LeagueSwitcher.tsx
  - apps/web/src/components/Onboarding.tsx
  - apps/web/src/components/TopBar.tsx
  - apps/web/src/components/tabs/LeagueTab.tsx
  - apps/web/src/components/tabs/PredictTab.tsx
  - apps/web/src/contexts/SessionContext.tsx
  - apps/web/src/pages/Join.tsx
  - apps/web/tests/helpers/mock-routes.ts
  - apps/web/tests/league-create.spec.ts
  - apps/web/tests/multi-league.spec.ts
  - apps/web/tests/predict-countdown.spec.ts
  - supabase/migrations/20260504000001_phase2_league.sql
findings:
  critical: 2
  warning: 5
  info: 4
  total: 11
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

This review covers the League & Prediction Core phase: league creation flow, multi-league support (LeagueSwitcher, Join page), prediction countdown UX, the SessionContext multi-league refactor, and two new SQL RPCs (`create_league`, `regenerate_invite_code`).

The overall shape of the code is sound. The session loading retry logic is thoughtful, the RPC design is clean, and the UI flow covers the intended paths. However, two critical issues require attention before shipping:

1. `is_league_admin` — referenced inside `regenerate_invite_code` — is not defined anywhere in the migration history. This will cause a runtime SQL error for every admin attempting to regenerate a code.
2. The `create_league` SQL function accepts a caller-supplied `p_user_id` parameter rather than reading `auth.uid()` from the session. Because the function is `SECURITY DEFINER`, any authenticated user can pass an arbitrary UUID and create a league on behalf of someone else.

Three warnings cover an unhandled promise, a race-condition window in `Onboarding`, a UI blocking path in `Join.tsx`, a `memberCount` prop hardcoded to `0`, and a dead `blurTimeout` ref that does nothing. Four informational items round out style and test-coverage notes.

---

## Critical Issues

### CR-01: `is_league_admin` referenced but never defined

**File:** `supabase/migrations/20260504000001_phase2_league.sql:68`
**Issue:** `regenerate_invite_code` calls `public.is_league_admin(p_league_id)` at line 68. This function does not exist in the init migration (`20260401000000_init_schema.sql`) and is not created anywhere in the Phase 2 migration. When an admin calls the RPC, PostgreSQL raises `ERROR: function public.is_league_admin(uuid) does not exist`, causing a hard failure with a confusing error message surfaced to the user.

**Fix:** Add the helper function before `regenerate_invite_code` in the same migration (or a prior one):

```sql
CREATE OR REPLACE FUNCTION public.is_league_admin(p_league_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.league_members
    WHERE league_id = p_league_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_league_admin(uuid) TO authenticated;
```

---

### CR-02: `create_league` RPC trusts caller-supplied `p_user_id` (privilege escalation)

**File:** `supabase/migrations/20260504000001_phase2_league.sql:19-49`
**Issue:** The function signature is `create_league(p_name text, p_user_id uuid)`. Because the function runs as `SECURITY DEFINER`, the caller can pass any `uuid` as `p_user_id`. This means an authenticated user can create a league and assign themselves as admin under a different user's identity — or create a league attributed to a non-existent user, bypassing any foreign-key constraint that might exist on `leagues.created_by`.

The calling code in `Onboarding.tsx` (line 115-118) already passes the authenticated `userId` obtained from `supabase.auth.signInAnonymously()`, so this is not exploitable from the client under normal conditions — but any direct API call to the RPC endpoint bypasses the client entirely.

**Fix:** Remove the `p_user_id` parameter and use `auth.uid()` inside the function:

```sql
CREATE OR REPLACE FUNCTION public.create_league(p_name text)
RETURNS TABLE(id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_id uuid;
  v_attempts int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- ... rest unchanged, replace p_user_id with v_user_id ...
END;
$$;
```

Update the client call in `Onboarding.tsx` to omit `p_user_id`:

```typescript
const { data, error: rpcErr } = await supabase.rpc("create_league", {
  p_name: newLeagueName.trim(),
  // p_user_id removed — RPC now reads auth.uid() internally
});
```

---

## Warnings

### WR-01: `handleSendRecovery` discards errors silently

**File:** `apps/web/src/components/Onboarding.tsx:135-138`
**Issue:** The recovery flow calls `supabase.auth.signInWithOtp({ email: recoveryEmail })` and immediately sets `recoverySent = true` without checking the returned `error`. If the OTP send fails (e.g., invalid email domain, rate limit, network error), the UI shows "Check your inbox" — the user waits for an email that was never sent.

**Fix:**
```typescript
const handleSendRecovery = async () => {
  const { error } = await supabase.auth.signInWithOtp({ email: recoveryEmail });
  if (error) {
    // Surface error — add a recoveryError state field similar to joinError
    setRecoveryError(error.message);
    return;
  }
  setRecoverySent(true);
};
```

---

### WR-02: `Join.tsx` — authenticated user sees a blank/stale UI while `leagueId` is null

**File:** `apps/web/src/pages/Join.tsx:66-82`
**Issue:** When an authenticated user lands on `/join/:code`, the component shows the "Add this league?" confirmation UI while `leagueId` is still `null` (the async lookup is in-flight). The `handleJoin` button is disabled via `disabled={joinLoading || !leagueId}` — so the button is safe — but the page renders `leagueName ?? code` in the subtitle (line 91) during the lookup, momentarily showing the raw code string in a sentence: "Join ABCD1 as a member." This is confusing and breaks if `lookupLoading` does not reset the loading spinner in time. More critically, if `code` is `undefined` (user navigates to `/join/` with no code param), the `useEffect` at line 19-33 never fires (`!code` is truthy), `leagueName` and `leagueId` stay null, and the user sees "Add this league? / Join undefined as a member." forever.

**Fix:** Guard the `undefined` case before rendering the confirmation UI:

```tsx
// After the loading/lookupLoading spinner block and before the !session check:
if (!code) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-[8px] text-pixel-red">Invalid invite link.</p>
    </div>
  );
}
```

---

### WR-03: `EnterResult` receives hardcoded `memberCount={0}`

**File:** `apps/web/src/components/tabs/PredictTab.tsx:291`
**Issue:** `<EnterResult ... memberCount={0} onConfirm={() => {}} />` passes a hardcoded `0` for `memberCount`. If `EnterResult` uses this value to display "Score entered for N members" or to decide whether to show a confirmation warning, the admin will always see "0 members" — potentially leading them to believe no one is in the league and dismissing a confirmation guard. The `onConfirm` callback is also a no-op.

**Fix:** Pass the real count from the already-fetched `members` array in `LeagueTab`, or thread `memberCount` down from the parent. At minimum, replace with the league member count from context or a separate query:

```tsx
// If members length is available via context or a prop:
memberCount={actualMemberCount}
onConfirm={() => {
  // actual post-confirm action, e.g. invalidate leaderboard
}}
```

---

### WR-04: `handleCreate` in `Onboarding` does not `await` the background `refreshSession` — navigation race on slow connections

**File:** `apps/web/src/components/Onboarding.tsx:127`
**Issue:** `refreshSession()` is called without `await` (intentionally fire-and-forget per the inline comment). However, when the user immediately clicks "Start predicting" on the confirmation screen and `handleStartPredicting` calls `await refreshSession()` again (line 382), there are now two concurrent `loadSession()` calls racing to call `setSession` and `setLeagues`. On a fast connection this is benign, but on a slow connection the first fire-and-forget `loadSession` may resolve *after* the second, clobbering the session with a stale result and navigating the user to `/` with `session === null`, which triggers the onboarding flow again.

**Fix:** Cancel the fire-and-forget or use a ref-guard:

```typescript
// Option A: simply await it too — the comment says "fire-and-forget to show screen sooner"
// but the confirmation screen is already shown at this point
refreshSession(); // Keep as-is — the risk is acceptable if the app re-checks auth on mount

// Option B (safer): use a loading flag to prevent concurrent calls in SessionContext's refreshSession
```

The simplest safe fix is to remove the background call in `handleCreate` and only call it in `handleStartPredicting`:

```typescript
// In handleCreate — remove line 127:
// refreshSession(); // <-- remove

// In handleStartPredicting — keep:
await refreshSession();
navigate("/");
```

---

### WR-05: Dead `blurTimeout` ref — cleanup leak

**File:** `apps/web/src/components/tabs/PredictTab.tsx:45, 205`
**Issue:** `blurTimeout` is declared as a `useRef` (line 45) and set in the `onBlur` handler of the home score input (line 205) with `setTimeout(() => {}, 100)` — an empty callback that does nothing. The ref is never read, the timeout is never cleared, and the away score input has no `onBlur` handler at all. This appears to be a leftover from an earlier debounce implementation. The timeout itself is harmless (empty callback), but it leaks a timer on every blur event and leaves dead code in the component.

**Fix:** Remove the `blurTimeout` ref and the `onBlur` handler entirely:

```tsx
// Remove:
const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

// Remove from home score input:
onBlur={() => { blurTimeout.current = setTimeout(() => {}, 100); }}
```

---

## Info

### IN-01: `LeagueSwitcher` — no empty-state handling when `leagues` is empty

**File:** `apps/web/src/components/LeagueSwitcher.tsx:28-44`
**Issue:** If `leagues` is an empty array (e.g., after a failed session load), `leagues.map(...)` renders an empty `<div>` with `pixel-border` styling but no content — a blank panel appears behind the overlay. The switcher is only reachable via `hasMultipleLeagues` guard in `TopBar`, so this is a low-probability path in production, but it could appear during loading races.

**Fix:** Add a guard inside the map or before the container:

```tsx
{leagues.length === 0 ? (
  <p className="px-4 py-3 text-xs text-muted-foreground">No leagues</p>
) : leagues.map((league) => ( ... ))}
```

---

### IN-02: `MOCK_LEAGUE_2.id` is not a valid UUID format

**File:** `apps/web/tests/helpers/mock-routes.ts:13`
**Issue:** `MOCK_LEAGUE_2.id` is `"bbbb-0000-0000-0000-000000000002"` — this is 4 characters in the first segment instead of the required 8 (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). While Supabase's JS client and Playwright mocks accept arbitrary strings, if any test ever sends this value to a real or stricter mock endpoint that validates UUID format, it will be rejected. `MOCK_LEAGUE.id` is correctly formatted.

**Fix:**
```typescript
export const MOCK_LEAGUE_2 = {
  id: "bbbbbbbb-0000-0000-0000-000000000002", // 8-char first segment
  name: "Second League",
  invite_code: "XKQZ",
};
```

---

### IN-03: All Playwright tests are `test.fixme` — zero executable test coverage

**File:** `apps/web/tests/league-create.spec.ts`, `apps/web/tests/multi-league.spec.ts`, `apps/web/tests/predict-countdown.spec.ts`
**Issue:** Every test in all three spec files is marked `test.fixme(...)`. Playwright skips `fixme` tests entirely — `bunx playwright test` will report 0 tests run for this phase's features. The mocking infrastructure in `mock-routes.ts` is wired up correctly but is never exercised. This means CI provides no signal about the league-create, multi-league, or countdown flows.

**Fix:** Promote tests to `test(...)` as the features stabilize. At minimum, the smoke tests in `multi-league.spec.ts` (PredictTab container visible) should be converted first as they are the least likely to be flaky.

---

### IN-04: `Onboarding` step 3 ("You're in!") calls `handleComplete(false)` unconditionally

**File:** `apps/web/src/components/Onboarding.tsx:516-521`
**Issue:** Step 3 is the "You're in!" screen rendered as the final `else` branch when `step === 3`. The "Start predicting" button calls `handleComplete(false)` — skipping email collection. However, the step type union (line 21) includes both `3` and `4`. The flow goes: step 1 → step 2 → (either step 3 to skip email, or step 4 to add email). If a user enters step 4 via the "Add email for multi-device" link (line 453) and then navigates back, `setStep(3)` is called — but there is no back button on step 3 to return to step 2, nor is there a path from step 3 back to step 4 after `setStep(3)` has been visited. This is a flow dead-end rather than a crash, but it may confuse users who visit step 4 first then press back.

**Fix:** Add an explicit "← Back" button on step 3 to return to step 2, mirroring the pattern used in all other steps.

---

_Reviewed: 2026-05-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
