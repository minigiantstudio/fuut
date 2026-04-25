# Phase 1: Foundation & Onboarding - Research

**Researched:** 2025-05-15
**Domain:** Web Development (React, Express, Supabase)
**Confidence:** HIGH

## Summary

This phase establishes the foundational infrastructure and authentication flow for 'fuut'. The core technical challenge is the frictionless transition from anonymous browsing to a permanent account while maintaining data continuity. Research confirms that Supabase v2 SDK supports this natively via account promotion (identity linking), ensuring the user's UUID remains constant. The backend will use Express with a custom middleware to validate Supabase JWTs. API-Football is the recommended data provider for the 2026 World Cup due to its ready-to-use 2026 season endpoints.

**Primary recommendation:** Use Supabase `auth.updateUser()` for account promotion to ensure UUID persistence, and implement a custom Express middleware using `supabase.auth.getUser(jwt)` for all protected routes.

<user_constraints>
## User Constraints (from CONTEXT.md)

*Note: CONTEXT.md does not exist yet. Using instructions from Phase 1 description.*

### Locked Decisions
- **Stack:** React (TS), Express (TS), Supabase (Auth/DB).
- **Auth Strategy:** Anonymous Auth first, then Account Promotion.
- **Data Source:** 2026 World Cup data.

### the agent's Discretion
- **Middleware Implementation:** Best practice for Express + Supabase.
- **Data Provider Selection:** Choice between API-Football and alternatives.

### Deferred Ideas (OUT OF SCOPE)
- **Monetization/Limits:** Phase 4.
- **Manual Score Entry:** Phase 3.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | Production infrastructure setup | Verified availability of Node/npm/git. Identified missing CLIs (Supabase/Vercel). |
| SETUP-02 | Backend service scaffolding | Drafted Express + TS middleware and project structure. |
| SETUP-03 | Supabase database schema | Confirmed UUID persistence for auth promotion. |
| AUTH-01 | User sign-up/login | Supabase Auth v2 handles this via standard flows. |
| AUTH-02 | Frictionless entry with nickname | Verified anonymous login + promotion preserves UUID. |
| AUTH-03 | Account verification | Supabase handles email confirmation in promotion flow. |
| AUTH-04 | User profile management | Verified RLS and UUID mapping in `public.profiles`. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User Authentication | API / Backend | Supabase Auth | Backend validates JWT; Supabase manages identity. |
| Anonymous Promotion | Client (SDK) | API / Backend | Client initiates; Backend ensures data continuity via UUID. |
| Score Verification | API / Backend | External API | Backend fetches official data to prevent client-side spoofing. |
| Match Schedule | Browser / Client | API / Backend | API fetches from provider; Client renders cached view. |
| Leaderboard Sync | API / Backend | Database | Supabase Realtime pushes updates calculated on backend. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.43.2 | Auth & DB client | Official SDK; handles anonymous auth natively. |
| express | 4.19.2 | API Framework | Industry standard for Node.js backends. |
| typescript | 5.4.5 | Type Safety | Required for maintainable codebase. |
| axios | 1.6.8 | HTTP Client | Reliable for fetching World Cup data. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|--------------|
| cors | 2.8.5 | Cross-Origin | Required for React -> Express communication. |
| dotenv | 16.4.5 | Env Management | Manage Supabase keys and API secrets. |

**Installation:**
```bash
# Backend
npm install express @supabase/supabase-js axios cors dotenv
npm install -D typescript @types/express @types/node @types/cors ts-node-dev

# Frontend
npm install @supabase/supabase-js
```

## Architecture Patterns

### Recommended Project Structure
```
fuut/
├── .planning/       # Planning & Research
├── api/             # Express Backend
│   ├── src/
│   │   ├── middleware/  # Auth & Validation
│   │   ├── routes/      # API Endpoints
│   │   ├── services/    # External API Integrations
│   │   └── index.ts     # Entry point
│   └── package.json
├── web/             # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/       # useAuth, etc.
│   │   └── App.tsx
│   └── package.json
└── supabase/        # Migrations & Seed
```

### Pattern 1: Account Promotion (Anonymous -> Permanent)
**What:** Convert an anonymous user to email/password while keeping the same UUID.
**When to use:** When a guest user decides to "Save Progress" or "Join League".
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/auth-anonymous
const { data, error } = await supabase.auth.updateUser({
  email: 'user@example.com',
  password: 'secure-password'
});
// data.user.id remains unchanged.
```

### Anti-Patterns to Avoid
- **Creating new user on promotion:** Do NOT use `signUp` for an existing anonymous user; it generates a new UUID and breaks data links. Use `updateUser`.
- **Client-side only auth:** Never trust `supabase.auth.getSession()` on the backend. Always use `getUser(jwt)`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT Validation | Manual decoding | `supabase.auth.getUser()` | Handles signature verification and expiry server-side. |
| Match Scores | Web scraping | API-Football | Real-time reliability and structured JSON. |
| Session Sync | LocalStorage logic | Supabase Auth SDK | Handles refresh tokens and multi-tab sync automatically. |

## Common Pitfalls

### Pitfall 1: Manual Linking Disabled
**What goes wrong:** `updateUser` fails when trying to add an email to an anonymous account.
**How to avoid:** Enable "Allow manual linking" in Supabase Dashboard > Auth > Settings.

### Pitfall 2: Token Refresh in Express
**What goes wrong:** Express middleware fails if the JWT is expired, but the client hasn't refreshed it yet.
**How to avoid:** Ensure React client uses `onAuthStateChange` to refresh tokens and pass the latest one in headers.

## Code Examples

### Express Auth Middleware
```typescript
// Source: [VERIFIED: web search]
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
};
```

### Fetching 2026 World Cup Fixtures (API-Football)
```typescript
// Source: [CITED: api-football.com]
import axios from 'axios';

const getFixtures = async () => {
  const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
    headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY },
    params: { league: 1, season: 2026 }
  });
  return response.data.response;
};
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 25.2.1 | — |
| npm | Pkg Manager | ✓ | 11.6.2 | — |
| git | Source Control | ✓ | 2.50.1 | — |
| Supabase CLI | Migrations | ✗ | — | Manual via Dashboard |
| Vercel CLI | Deployment | ✗ | — | GitHub Integration |
| Railway CLI | Backend Host | ✗ | — | Dashboard deploy |

**Missing dependencies with no fallback:**
- None (All have dashboard/UI alternatives).

## Sources

### Primary (HIGH confidence)
- Supabase Official Docs - [Anonymous Auth & Promotion](https://supabase.com/docs/guides/auth/auth-anonymous)
- API-Football Docs - [League ID 1 for World Cup](https://api-football.com)

### Secondary (MEDIUM confidence)
- StackOverflow/Community - Express middleware patterns for Supabase.

## Metadata
**Confidence breakdown:**
- Standard stack: HIGH - Core libraries are stable and well-documented.
- Architecture: HIGH - UUID persistence is a first-class feature in Supabase v2.
- Pitfalls: MEDIUM - Dependent on specific Supabase dashboard settings.

**Research date:** 2025-05-15
**Valid until:** 2025-06-15
