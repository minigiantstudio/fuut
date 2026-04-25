# Phase 1 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase anonymous promotion fails | High | Ensure "Allow manual linking" is enabled in Supabase Dashboard. Use `updateUser` instead of `signUp` to preserve UUID. |
| Monorepo migration breaks prototype build | Medium | Perform migration in a dedicated task with immediate verification. Use shared types for all domain entities. |
| Auth middleware performance | Low | Supabase `getUser(jwt)` is optimized. If latency becomes an issue, implement short-lived local caching of user profiles. |
| Cross-domain CORS issues | Medium | Explicitly configure CORS in Express to allow the React frontend's domain. |
| Secret leakage (Supabase Keys) | High | Use `.env` files for all sensitive keys. Add `.env` to `.gitignore`. Use only 'anon' keys on the client. |
