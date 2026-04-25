# Phase 1 Threat Model

## Trust Boundaries
- **User Client <-> Supabase Auth:** Handles identity creation and management.
- **User Client <-> Backend API:** Handles business logic and data orchestration.
- **Backend API <-> Supabase DB:** Handles persistent storage.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-1 | Spoofing | User Identity | Mitigate | Backend must verify JWT signature via `supabase.auth.getUser()`. Do not trust client-sent user IDs. |
| T-1-2 | Tampering | Profile Data | Mitigate | Use PostgreSQL Row Level Security (RLS) to ensure users can only modify their own profiles. |
| T-1-3 | Repudiation | Auth Events | Mitigate | Enable Supabase Auth audit logging to track account promotions and login events. |
| T-1-4 | Information | Env Secrets | Mitigate | Never commit `.env` files. Rotate Supabase Service Role keys immediately if leaked. |
| T-1-5 | Denial | Auth API | Mitigate | Rely on Supabase's native rate limiting for auth endpoints (signIn, signUp). |
| T-1-6 | Elevation | Admin Flags | Mitigate | Avoid storing 'is_admin' flags in client-accessible profile fields. Use a separate `roles` table if needed. |

## Security Controls
- **JWT Verification:** All protected API routes must use the Supabase Auth middleware.
- **RLS Enforcement:** No direct client access to sensitive tables without strictly defined policies.
- **HTTPS Only:** Enforce TLS for all communications in production.
