# Codebase Structure

**Analysis Date:** 2025-05-14

## Directory Layout

```
fuut/
├── Docs/               # Requirements, specs, and design documents
├── prototype/          # Frontend prototype (Vite + React + Shadcn)
│   ├── src/
│   │   ├── components/ # Shared UI components and layout
│   │   ├── hooks/      # Custom React hooks
│   │   ├── pages/      # Route entry points
│   │   ├── tabs/       # Main app feature tabs
│   │   └── ui/         # Shadcn base components
│   └── public/         # Static assets
├── src/                # Implementation root (currently mostly empty)
│   ├── app/            # Main application entry (Planned)
│   ├── components/     # Shared components (Planned)
│   ├── features/       # Feature-based modules (Planned)
│   ├── services/       # Backend services and API (Planned)
│   ├── shared/         # Shared utilities and types (Planned)
│   └── tests/          # Integration and unit tests (Planned)
└── infra/              # Infrastructure as code, CI/CD, Observability
```

## Directory Purposes

**Docs/:**
- Purpose: Source of truth for product and technical requirements.
- Contains: Markdown files for requirements, architecture, and engineering workflows.
- Key files: `requirements.md`, `design-specification.md`, `system-overview.md`.

**prototype/:**
- Purpose: High-fidelity UI/UX prototype.
- Contains: React components implementing the pixel-art aesthetic.
- Key files: `src/App.tsx`, `src/components/tabs/PredictTab.tsx`.

**src/app/:**
- Purpose: Application entry point and routing configuration.
- Contains: `main.tsx`, `App.tsx` (Migrated from prototype).

**src/features/:**
- Purpose: Business logic grouped by feature (Leagues, Predictions, Leaderboard).
- Contains: State, components, and logic specific to a feature.

**src/services/:**
- Purpose: Backend logic and external API integrations.
- Contains: Express server, Supabase client, Sports API client.

## Key File Locations

**Entry Points:**
- `prototype/src/main.tsx`: Current frontend entry point.
- `src/main.ts`: Planned backend entry point.

**Configuration:**
- `prototype/tailwind.config.ts`: Visual theme definition.
- `prototype/vite.config.ts`: Build and dev server config.
- `prototype/vitest.config.ts`: Test runner config.

**Core Logic:**
- `prototype/src/components/tabs/PredictTab.tsx`: Main prediction interface logic.
- `prototype/src/components/Onboarding.tsx`: User entry flow.

**Testing:**
- `prototype/src/test/setup.ts`: Vitest environment setup.
- `prototype/src/test/example.test.ts`: Sample test file.

## Naming Conventions

**Files:**
- React Components: PascalCase (`PredictTab.tsx`)
- Hooks: camelCase starting with `use` (`useMobile.tsx`)
- Logic/Utilities: camelCase (`utils.ts`)

**Directories:**
- Feature folders: kebab-case (`league-management`)
- Component folders: lowercase or PascalCase (`components/ui`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/features/[feature-name]/`
- Tests: `src/features/[feature-name]/__tests__/`

**New Component/Module:**
- Shared UI: `src/components/ui/` (Shadcn)
- Shared Business Component: `src/components/`

**Utilities:**
- Shared helpers: `src/shared/utils/`
- Types: `src/shared/types/`

## Special Directories

**infra/:**
- Purpose: Deployment and CI configuration.
- Committed: Yes.

**.planning/:**
- Purpose: Project management and codebase mapping metadata.
- Committed: Yes.

---

*Structure analysis: 2025-05-14*
