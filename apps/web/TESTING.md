# E2E Testing — apps/web

## Stack

- [Playwright](https://playwright.dev/) with Chromium
- Supabase network calls are intercepted via `page.route()` — **no real Supabase project is hit during tests**

## Running tests

```bash
# From monorepo root
bun run test --filter @fuut/web

# Or from apps/web directly
cd apps/web
npx playwright test
```

Playwright starts the Vite dev server automatically on port 8080 (`reuseExistingServer: true` in local dev).

## Test structure

```
tests/
  auth.spec.ts          — Onboarding & auth flows
  helpers/
    mock-routes.ts      — Playwright fixture that auto-mocks all Supabase endpoints
  fixtures/             — (reserved for future static fixture data)
```

## How mocking works

`tests/helpers/mock-routes.ts` exports a custom `test` fixture with `mockSupabase: { auto: true }`.  
Every test file that imports `{ test, expect }` from `./helpers/mock-routes` gets automatic Supabase mocking with no extra setup.

### What's mocked

| Endpoint | Behaviour |
|---|---|
| `GET/POST /rest/v1/**` | Returns `[]` (empty array) |
| `POST /auth/v1/**` | Returns `{ user: null, session: null }` |
| `POST /rest/v1/rpc/lookup_league_by_invite_code` | Returns `[MOCK_LEAGUE]` when `p_code === "TEST1"`, otherwise `[]` |

### Adding a new mock

1. Open `tests/helpers/mock-routes.ts`
2. Add a new `page.route(...)` call inside `setupSupabaseMocks` **after** the generic fallbacks (last registration = highest priority in Playwright)
3. Add any fixture data as an exported constant

## Constants

| Name | Value | Purpose |
|---|---|---|
| `MOCK_INVITE_CODE` | `"TEST1"` | A valid invite code in mock context |
| `MOCK_LEAGUE` | `{ id: "aaaaaaaa-...", name: "Test League" }` | League returned for `MOCK_INVITE_CODE` |

## Environment variables

No special env vars are required for tests — the Supabase URL is read from `.env.local` at build time (Vite bakes it in), but all network traffic to that URL is intercepted by the mock routes before it leaves the browser.

If `.env.local` is missing, Vite will use empty strings which are also intercepted by the mocks. Tests will still pass.

## CI

In CI, set `CI=true` so Playwright does not try to reuse a running server:

```yaml
- run: npx playwright install chromium --with-deps
- run: npx playwright test
  env:
    CI: true
    VITE_SUPABASE_URL: https://hqixsfarkhrwfaqvnvzi.supabase.co
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

The anon key is only needed so Vite can build — no real requests are made.
