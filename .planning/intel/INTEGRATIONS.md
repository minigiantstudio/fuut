# External Integrations

**Analysis Date:** 2025-05-14

## APIs & External Services

**Match Data:**
- API-Football or ESPN - Used to fetch live match results and schedules for the 2026 World Cup.
  - SDK/Client: REST API via `axios` or `fetch`.
  - Auth: API Key (Planned: `SPORTS_API_KEY`)

**Social/Sharing:**
- WhatsApp/Telegram - Used for sharing league invite codes and ranking snapshots.
  - Integration: Deep links / Share API.

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: Supabase Client SDK.
  - Client: `supabase-js`

**File Storage:**
- Supabase Storage - For user avatars or generated ranking snapshots.

**Caching:**
- None (Planned: Local memory cache or Supabase client caching).

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: JWT-based sessions, Email/Password login.

## Monitoring & Observability

**Error Tracking:**
- None (Planned: Sentry).

**Logs:**
- Console logging (Planned: Winston/Pino for backend).

## CI/CD & Deployment

**Hosting:**
- Vercel (Frontend), Railway/Docker (Backend).

**CI Pipeline:**
- GitHub Actions (Planned for Vitest/Playwright runs).

## Environment Configuration

**Required env vars:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Backend only)
- `SPORTS_API_KEY`

**Secrets location:**
- GitHub Actions Secrets / Deployment platform environment variables.

## Webhooks & Callbacks

**Incoming:**
- Sports API Webhooks (Optional) - For real-time goal notifications.

**Outgoing:**
- None.

---

*Integration audit: 2025-05-14*
