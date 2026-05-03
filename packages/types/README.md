# @fuut/types

Shared TypeScript types for the Fuut monorepo, including a fully-generated Supabase schema.

## Contents

| File | Description |
|---|---|
| `src/database.types.ts` | Auto-generated from the live Supabase project — **do not edit by hand** |
| `src/index.ts` | Barrel export: re-exports `Database`, row aliases (`DbMatch`, etc.), and legacy hand-written types |

## Regenerating types after a schema change

Whenever you add, rename, or drop a table/column in Supabase, run:

```bash
# From the monorepo root
SUPABASE_PROJECT_ID=hqixsfarkhrwfaqvnvzi bun run gen --filter @fuut/types

# Or from inside packages/types
cd packages/types
SUPABASE_PROJECT_ID=hqixsfarkhrwfaqvnvzi bun run gen
```

> **Tip:** Put `SUPABASE_PROJECT_ID=hqixsfarkhrwfaqvnvzi` in your `.env` (root or `apps/api/.env`) so you don't have to type it each time. The `gen` script reads it automatically.

The script runs:
```
supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/database.types.ts
```

Commit the updated `src/database.types.ts` so all consumers stay in sync.

## Using the types

### Typed Supabase client (API)

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@fuut/types';

export const supabase = createClient<Database>(url, anonKey);

// Now query results are fully typed:
const { data } = await supabase.from('matches').select('*');
// data: Database['public']['Tables']['matches']['Row'][] | null
```

### Row-level aliases (recommended)

```ts
import type { DbMatch, DbPrediction, DbUser } from '@fuut/types';

function formatMatch(match: DbMatch) { ... }
```

### Available aliases

| Alias | Table |
|---|---|
| `DbUser` | `public.users` |
| `DbLeague` | `public.leagues` |
| `DbLeagueMember` | `public.league_members` |
| `DbMatch` | `public.matches` |
| `DbPrediction` | `public.predictions` |
| `DbLeaderboardSnapshot` | `public.leaderboard_snapshots` |

## Building for production

```bash
cd packages/types
bun run build   # tsc → dist/
```

The production API imports from `dist/`, development uses `src/` directly via `ts-node`.
