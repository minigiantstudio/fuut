# Fuut

A retro-cool 2026 World Cup prediction game.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### Installation

```bash
bun install
```

## Running Locally

### 1. Start Supabase

```bash
supabase start        # starts local Supabase (Docker must be running)
supabase db reset     # apply migrations + seed data
```

Studio is available at `http://127.0.0.1:54323`.

### 2. Frontend (React + Vite)

```bash
cd apps/web && bun --bun vite
```

Runs on `http://localhost:8080`.

### 3. Backend (Express)

```bash
cd apps/api && bun run dev
```

Runs on `http://localhost:3001`.

### Switching between local and remote Supabase

| | Frontend | Backend |
|---|---|---|
| **Local** | `cd apps/web && bun --bun vite` | `cd apps/api && bun run dev` |
| **Remote** | `cd apps/web && bun --bun vite --mode remote` | `cd apps/api && bun run dev:remote` |

## Project Structure

- `apps/web/` - React frontend application (Vite)
- `apps/api/` - Express backend API
- `packages/types/` - Shared TypeScript types
- `.planning/` - Planning documents and roadmap

## Available Scripts

- `bun run dev` - Start development servers in all workspaces
- `bun run build` - Build all workspaces
- `bun run test` - Run tests in all workspaces

## Package Manager

This project uses **bun** as the primary package manager. The committed lockfile is `bun.lock` at the root. Prefer `bun install` and `bun run <script>` over npm/yarn equivalents.

## Development Conventions

See [CLAUDE.md](./CLAUDE.md) for branch naming, commit message conventions, and other development guidelines.
