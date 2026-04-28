# Phase 1: Foundation & Onboarding - Validation Strategy

This document outlines the testing and verification strategy for Phase 1. It ensures that the foundation is solid before moving to feature development.

## 1. Database & Schema Validation

### Automated Checks
- **Supabase CLI Lint:** `supabase db lint` ensures migration files are valid SQL and follow best practices.
- **Existence Script:** A custom script `scripts/verify-db.ts` (or equivalent) that connects to the database and checks for the existence of required tables and columns.
- **RLS Policy Verification:** Integration tests using `pgTAP` or a local testing environment to verify that policies correctly restrict access.

### Manual Verification
- **Supabase Dashboard:** Inspect table structure and RLS policies in the Supabase UI.
- **Auth Trigger Test:** Manually create a user in `auth.users` and verify that a corresponding entry appears in `public.profiles`.

## 2. Backend Authentication Validation

### Automated Checks
- **Middleware Unit Tests:** Tests for `authMiddleware` using mocked Supabase responses.
  - Case 1: Missing token -> 401.
  - Case 2: Invalid token -> 401.
  - Case 3: Valid token -> 200 + `req.user` populated.
- **API Integration Tests:** `curl` or `supertest` requests to `/api/me` with various headers.

### Manual Verification
- **Postman/Insomnia:** Use a valid JWT from a Supabase Auth session to call the backend.

## 3. Deployment & Infrastructure

### Automated Checks
- **Health Checks:** Periodic monitoring of the `/health` endpoint in the deployed environment.
- **CI/CD Pipeline:** Verify that migrations are applied automatically during deployment.

## 4. Success Criteria Verification Matrix

| Requirement | Test Method | Expected Outcome |
|-------------|-------------|------------------|
| SETUP-03 (Profiles Table) | `scripts/verify-db.ts` | Table exists with `id`, `nickname`, etc. |
| SETUP-03 (Matches Table) | `scripts/verify-db.ts` | Table exists matching `@fuut/types`. |
| SETUP-03 (Predictions Table) | `scripts/verify-db.ts` | Table exists matching `@fuut/types`. |
| AUTH-02 (RLS Policies) | Integration Tests | Unauthorized users cannot update others' profiles. |
| SETUP-02 (Backend Auth) | `npm test` (API) | Middleware blocks requests without valid Supabase JWT. |
| SETUP-01 (Health) | `curl /health` | Returns 200 OK. |
