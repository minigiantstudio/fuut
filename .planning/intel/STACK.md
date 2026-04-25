# Technology Stack

**Analysis Date:** 2026-04-01

## Languages

**Primary:**
- TypeScript 5.8 - Used for frontend (prototype) and planned for backend.

**Secondary:**
- SQL (PostgreSQL) - Planned for data persistence via Supabase.
- CSS (Tailwind) - Used for styling the retro pixel-art interface.

## Runtime

**Environment:**
- Node.js (Planned for backend)
- Bun/Vite (Used for frontend prototype development)

**Package Manager:**
- Bun 1.x
- Lockfile: `bun.lock` (present in `prototype/`)

## Frameworks

**Core:**
- React 18.3 - Frontend library.
- Vite 5.4 - Build tool and dev server.
- Express (Planned) - Backend runtime.

**UI/Styling:**
- Tailwind CSS 3.4 - Utility-first CSS.
- Shadcn UI / Radix UI - Accessible component primitives.
- Lucide React - Icon library.

**Data Fetching/State:**
- TanStack Query 5.83 - Server state management (client-side stubs in prototype).
- React Hook Form 7.61 - Form management.
- Zod 3.25 - Schema validation.

**Testing:**
- Vitest 3.2 - Unit and component testing.
- Playwright 1.57 - End-to-end testing.

**Build/Dev:**
- Tailwind CSS 3.4 - Utility-first CSS framework.
- Shadcn UI - Component library built on Radix UI primitives.

## Key Dependencies

**Critical:**
- `supabase-js` (Planned) - Client for database, auth, and real-time.
- `press-start-2p` (Inferred) - Font for pixel art aesthetic.

**Infrastructure:**
- Lucide React - Icon set for UI elements.
- Recharts - Data visualization for leaderboards and trends.

## Configuration

**Environment:**
- `.env` (Not detected in prototype, but required for Supabase URL/Key).
- `tsconfig.json` - TypeScript configuration.
- `vite.config.ts` - Vite configuration.
- `tailwind.config.ts` - Tailwind theme and pixel-art utilities.

**Build:**
- Vite build pipeline for frontend.
- `tailwind.config.ts` - Tailwind theme and plugin configuration.
- Docker for backend deployment.

## Platform Requirements

**Development:**
- Node.js / Bun
- Docker

**Production:**
- Vercel/Railway/VPS for frontend and backend.
- Supabase (PaaS) for database and auth.

---

*Stack analysis: 2026-04-01*
