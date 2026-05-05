# Fuut

A retro-cool 2026 World Cup prediction game.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (package manager)
- Node.js 18+ (for compatibility)

### Installation

```bash
bun install
```

## Running Locally

### Frontend (React + Vite)

From the project root or the `apps/web` directory:

```bash
cd apps/web && bun run dev
```

Or using the bun runtime directly (recommended):

```bash
cd apps/web && bun --bun vite
```

The frontend will start on `http://localhost:5173`

### Backend (Express)

From the project root or the `apps/api` directory:

```bash
cd apps/api && bun run dev
```

The backend will start on the port defined in `apps/api/src/index.ts`

### Run Both Simultaneously

From the project root, run both in separate terminal windows:

```bash
bun run dev
```

This runs the dev script in all workspaces that have one.

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
