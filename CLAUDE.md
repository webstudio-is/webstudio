# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Webstudio is an Open Source Visual Development Platform. This is a pnpm monorepo with three workspace types: `apps/`, `packages/`, and `fixtures/`.

- **Node.js**: 22 (see `.nvmrc`)
- **Package manager**: pnpm 9.14.4 (do not use npm or yarn)

## Common Commands

```bash
# Development
pnpm dev                    # Start builder app dev server (Remix + Vite)

# Build
pnpm build                  # Build all packages (excludes fixtures)

# Testing & Checks
pnpm checks                 # Run tests + typecheck + lint + fixtures (full CI)
pnpm test                   # Run tests across all packages
pnpm typecheck              # TypeScript type-check all packages
pnpm lint                   # ESLint with max-warnings 0

# Formatting
pnpm format                 # Prettier format all TS/TSX/MD files

# Single test file (from repo root)
pnpm --filter='@webstudio-is/builder' test -- run path/to/file.test.ts
# Or from apps/builder/
pnpm test -- run path/to/file.test.ts
```

### Builder App

```bash
cd apps/builder
pnpm dev          # Dev server (also pre-builds http-client)
pnpm dev:auth     # Dev server with OAuth debug logging
pnpm build        # Production build
pnpm typecheck    # Uses tsgo (TypeScript native preview) for speed
pnpm test         # vitest run
```

## Architecture

### Monorepo Structure

```
apps/builder/          # Main visual builder UI (Remix + Vite)
packages/              # 33 shared packages
fixtures/              # Template projects for deployment targets
```

### Main App (`apps/builder`)

Remix fullstack application. The `app/` directory structure:

- `canvas/` — Iframe canvas rendering the user's page for editing
- `builder/` — Builder UI panels (style, settings, navigator, topbar, etc.)
  - `features/` — Feature modules (style-panel, settings-panel, breakpoints, etc.)
  - `shared/` — Shared builder utilities (stores, asset management, etc.)
- `dashboard/` — Project dashboard
- `routes/` — Remix routes
- `shared/` — App-wide utilities

The builder communicates with the canvas via `postMessage`. State is managed with [nanostores](https://github.com/nanostores/nanostores).

### Key Packages

| Package                                    | Purpose                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| `@webstudio-is/sdk`                        | Core data model and Zod schemas for Webstudio projects |
| `@webstudio-is/react-sdk`                  | Runtime API for rendering Webstudio projects in React  |
| `@webstudio-is/design-system`              | UI component library (Radix UI + Stitches)             |
| `@webstudio-is/css-engine`                 | CSS generation and runtime styling                     |
| `@webstudio-is/css-data` / `html-data`     | CSS/HTML specs and metadata                            |
| `@webstudio-is/sdk-components-react`       | Default component library                              |
| `@webstudio-is/sdk-components-react-radix` | Radix UI component integrations                        |
| `@webstudio-is/trpc-interface`             | tRPC router definitions (client-server API)            |
| `@webstudio-is/prisma-client`              | Prisma ORM database layer                              |
| `@webstudio-is/cli`                        | CLI for linking/syncing/building projects              |

### Export Conditions

Packages use a custom `"webstudio"` export condition to split code between design-time (builder) and runtime (user's site). Tests resolve this with `conditions: ["webstudio", "browser"]`.

## Code Conventions (Enforced by ESLint)

- **Filenames**: kebab-case required (`unicorn/filename-case`)
- **React imports**: No default imports — use named imports (`import { useState } from "react"`, not `import React from "react"`)
- **Functions**: Expression style required (`const foo = () => {}`, not `function foo() {}`)
- **Node imports**: Use `node:` protocol (`node:path`, not `path`)
- **Console**: Only `console.warn`, `console.error`, `console.info` allowed (no `console.log`)
- **Equality**: Always `===` (except null comparisons)

## Testing

- **Framework**: Vitest with jsdom environment
- Test files live alongside source as `*.test.ts` / `*.test.tsx`
- Path alias `~` resolves to `apps/builder/app/` in builder tests
- Coverage via `@vitest/coverage-v8`

## TypeScript

- Shared base config in `packages/tsconfig`
- Target ES2023, strict mode enabled
- Builder uses `tsgo` (TypeScript native preview) for `typecheck` speed
- Generated files in `__generated__/` directories are excluded from lint

## Pre-commit Hooks

nano-staged runs Prettier on staged `*.{ts,tsx,js,json,css,md}` files automatically.
