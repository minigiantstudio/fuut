# Gemini / agent rules for the Fuut repo

## Local development — migrations

When running locally, always ensure the database is in sync before starting work:

```bash
supabase start          # start local Supabase (requires Docker)
supabase db reset       # apply all migrations + seed fresh
```

Before adding a new migration:
1. Check `supabase/migrations/` to understand existing schema.
2. Name files `YYYYMMDDHHmmss_description.sql` — Supabase applies them in filename order.
3. After adding a migration, run `supabase db reset` locally to verify it applies cleanly.
4. Never edit an already-committed migration file; create a new one instead.

If a migration fails on `supabase db reset`, fix the SQL before committing — a broken migration blocks every other dev's local setup.

## Package manager

This repo uses **bun** for installs and dev scripts. The committed lockfile is
`bun.lock` at the root. Prefer `bun install` and `bun run <script>`.

For Vite specifically, prefer `bun --bun vite` over `bun run dev` to ensure
the runtime is bun (avoids a Node x64 / bun arm64 native-binary mismatch on
some macOS machines).

## Local vs remote environments

- **Local dev:** `bun --bun vite` (web) + `bun run dev` (api) — uses `.env.local` / `.env`
- **Remote dev:** `bun --bun vite --mode remote` (web) + `bun run dev:remote` (api) — uses `.env.remote`

## Where the source of truth lives

- **What to build, in what order:** `.planning/ROADMAP.md`
- **Current snapshot of progress, decisions, todos:** `.planning/STATE.md`
- **Per-plan executable spec:** `.planning/phases/<phase>/<XX>-<YY>-PLAN.md`
- **Per-plan completion record:** `.planning/phases/<phase>/<XX>-<YY>-SUMMARY.md`
