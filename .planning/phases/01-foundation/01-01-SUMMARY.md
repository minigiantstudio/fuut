---
phase: 01-foundation
plan: 01
type: summary
status: shipped
requirements: [SETUP-01, SETUP-02]
---

# Plan 01-01 Summary: Monorepo Initialization & Type Definitions

**Phase**: 01-foundation
**Plan**: 01
**Subsystem**: Monorepo structure + shared types
**Shipped**: Initial commit — monorepo scaffold committed to `jaiversin/fuut`

---

## Overview

Plan 01-01 initialised the monorepo workspace structure and migrated the prototype codebase into `apps/web`. It established `packages/types` as the shared TypeScript type package consumed by both the frontend and backend. This was the scaffolding plan — everything subsequent depends on it.

---

## Planned vs. Delivered

| Planned | Delivered |
|---|---|
| `package.json` with npm workspaces | `package.json` with Bun workspaces (DEC-008: Bun chosen over npm) |
| `packages/types/src/index.ts` — hand-written shared types | `packages/types/src/index.ts` — hand-written + generated `Database` types (added later in follow-up) |
| `apps/web` — prototype migrated and building | ✅ Vite + React prototype migrated; builds via `vite build` |
| `apps/api` — placeholder package | ✅ Express API scaffold created in plan 01-02 |
| `@fuut/types` workspace dep in `apps/web` | Removed from `apps/web/package.json` (Vercel build doesn't have access to local workspace packages); types kept as `apps/web/src/lib/supabase/types.ts` |

---

## Delivered

### Monorepo Structure

```
fuut/
  package.json              — Bun workspaces root
  apps/
    web/                    — @fuut/web (Vite + React)
    api/                    — @fuut/api (Express, added plan 01-02)
  packages/
    types/                  — @fuut/types (shared DB types)
```

### Workspace Configuration

Root `package.json` uses Bun workspaces:
```json
{ "workspaces": ["apps/*", "packages/*"] }
```

### Shared Types (`packages/types`)

`packages/types/src/index.ts` exports:
- `Database` — fully generated from live Supabase project via `supabase gen types` (added in follow-up after plan 01-03)
- `Json` — Supabase JSON scalar type
- Row aliases: `DbUser`, `DbLeague`, `DbLeagueMember`, `DbMatch`, `DbPrediction`, `DbLeaderboardSnapshot`
- Legacy hand-written types for app-level use

`packages/types/package.json` configuration:
- `"main": "src/index.ts"` — ts-node compatible (no build step in dev)
- `"exports"` — dist for production, src for development default
- `"scripts.gen"` — regenerates types from live Supabase project

---

## Key Decisions

- **DEC-008 (implicit)**: Bun chosen as package manager and runtime over npm. `bun install` instead of `npm install`; dev server via `bun --bun vite` (DEC-007).
- **`@fuut/types` not available to `apps/web` on Vercel**: Vercel builds `apps/web` in isolation; local workspace packages aren't resolvable. Web app maintains its own `src/lib/supabase/types.ts`. `@fuut/types` is used only by `apps/api` which runs locally.

---

## Files Created

| File | Purpose |
|---|---|
| `package.json` | Bun workspaces root |
| `packages/types/package.json` | `@fuut/types` package definition |
| `packages/types/src/index.ts` | Shared type barrel (generated + aliases) |
| `packages/types/src/database.types.ts` | Auto-generated from Supabase (added in follow-up) |
| `packages/types/README.md` | Usage guide for `bun run gen`, `createClient<Database>()` |
| `apps/web/` | Prototype migrated to workspace |

---

## Tests

| Test | Status | Notes |
|---|---|---|
| `bunx tsc --noEmit` (apps/web) | ✅ Passes | No type errors |
| `bunx tsc --noEmit` (apps/api) | ✅ Passes | After removing ghost `@types/node 2` directory |
| `bun run build` (apps/web) | ✅ Passes | Vite production build; 590 kB JS bundle (1 chunk size warning, not an error) |
| `bun run build` (apps/api) | ✅ Passes | tsc → dist/ |
| Workspace resolution | ✅ Verified | `@fuut/types` resolves from `apps/api` |

---

## Known Gaps & Follow-ups

| # | Gap | Status |
|---|---|---|
| 1 | `@fuut/types` not usable from `apps/web` on Vercel | Accepted — web uses local types; API uses workspace package |
| 2 | No `01-01-SUMMARY.md` written at ship time | ✅ Resolved — this file |
| 3 | Ghost `@types/node 2` empty directory in root `node_modules/@types/` blocked `apps/api` tsc | ✅ Fixed — removed during Phase 1 verification |

---

## Self-Check

- [x] Monorepo structure initialised with Bun workspaces
- [x] `packages/types` exports `Database` type and row aliases
- [x] `apps/web` builds (`vite build`) with zero errors
- [x] `apps/api` builds (`tsc`) with zero errors
- [x] `@fuut/types` resolvable from `apps/api` via workspace link
