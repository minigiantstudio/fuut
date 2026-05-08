# Architecture

**Analysis Date:** 2025-05-14

## Pattern Overview

**Overall:** Monolithic Backend with a SPA Frontend (React) leveraging BaaS (Supabase).

**Key Characteristics:**
- **Shared-Nothing Monolith:** Single backend service handling API and Background Jobs.
- **BaaS Integration:** Offloading Auth and Real-time updates to Supabase.
- **Real-time Synchronization:** Leaderboards updated via Supabase subscriptions.

## Layers

**Frontend (Client):**
- Purpose: Interactive UI for predictions, rankings, and league management.
- Location: `prototype/` (planned to be moved to `src/app/` or similar).
- Contains: React components, hooks, and state management.
- Depends on: Supabase Client, TanStack Query.
- Used by: End Users.

**Backend (Server):**
- Purpose: API orchestration, cron jobs for scoring, and admin tools.
- Location: `src/services/` (Planned).
- Contains: Express routes, cron logic, and data access.
- Depends on: Supabase Service SDK, External Sports API.
- Used by: Frontend.

**Data (BaaS):**
- Purpose: Persistent storage and real-time event broadcasting.
- Location: Supabase Cloud.
- Contains: PostgreSQL tables, Public users, and real-time triggers.
- Depends on: None.
- Used by: Backend and Frontend (read-only for some tables).

## Data Flow

**Match Scoring Flow:**

1. Sports API updates match result → Backend Cron Job detects finished match.
2. Backend calculates points for all predictions in all leagues.
3. Backend updates `predictions` and `league_members` tables in Supabase.
4. Supabase broadcasts update to connected clients via Real-time subscriptions.
5. Frontend UI (Leaderboard) updates instantly for users.

**State Management:**
- Server state handled by TanStack React Query.
- Global UI state (active tab, notifications) handled by React `useState`/`useContext`.

## Key Abstractions

**Scoring Engine:**
- Purpose: Logic to determine points based on predicted vs actual scores.
- Location: `src/services/scoring.ts` (Planned).
- Pattern: Strategy pattern for different scoring rules (exact, winner, bonus).

**League Manager:**
- Purpose: Handles league creation, membership, and invite codes.
- Examples: `prototype/src/components/tabs/LeagueTab.tsx` (Current mock).

## Entry Points

**Frontend Entry:**
- Location: `prototype/src/main.tsx`
- Triggers: Browser page load.
- Responsibilities: Initialize React, QueryClient, and Router.

**Backend Entry:**
- Location: `src/main.ts` (Planned).
- Triggers: Process start.
- Responsibilities: Start Express server and initialize Cron jobs.

## Error Handling

**Strategy:** Fail-fast on input validation; Retry with backoff for external API failures.

**Patterns:**
- Zod schema validation for API requests.
- Exponential backoff for Sports API retries.
- Admin manual override flag for score discrepancies.

## Cross-Cutting Concerns

**Logging:** Pino for structured logging on backend.
**Validation:** Zod for end-to-end type safety.
**Authentication:** Supabase Auth with JWT middleware.

---

*Architecture analysis: 2025-05-14*
