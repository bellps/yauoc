# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `npm run dev` — start Next.js development server on `http://localhost:3000`
- **Build**: `npm run build` — build production application (Next.js `standalone` output)
- **Production**: `npm run start` — start production server
- **Type check**: `npx tsc --noEmit` — verify TypeScript without emitting

## Docker Commands (preferred for local dev)

All orchestration is exposed via `make help`. The dev stack runs Postgres 16 + the Next.js app with hot reload.

- **Build dev image**: `make build` (`docker compose build app`)
- **Start stack**: `make up`
- **Stop stack**: `make down` (`make clean` to also drop volumes)
- **Logs**: `make logs`
- **App shell**: `make shell`
- **DB shell (psql)**: `make db-shell`
- **Build prod image**: `make build-prod` (`docker build -t yauoc:latest .`)

## Database Commands

Prefer the Make targets when the dev stack is up; the raw commands work inside the app container or against a local Postgres.

- **Apply schema**: `make db-push` / `npm run db:push` / `npx prisma db push`
- **Generate Prisma Client**: `make db-generate` / `npm run db:generate` / `npx prisma generate`
- **Seed admin user**: `make db-seed` / `npm run db:seed`
- **Prisma Studio**: `make db-studio` / `npm run db:studio`
- **Reset DB (destructive)**: `make db-reset`

The project uses `prisma db push` (no migrations folder) while the schema is still young. Switch to `prisma migrate` once the schema stabilizes.

## Architecture Overview

This is a Next.js 14 application using the App Router, built to organize our wedding: family registry, RSVP, gift list, and an admin panel.

### Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: Tailwind CSS (plain utility classes; no component library)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth v5 (beta) with JWT sessions and a Credentials provider
- **Validation**: Zod
- **Password hashing**: bcryptjs
- **Container**: Docker + docker-compose (`node:22-slim` for Prisma/OpenSSL compat)

### Database Schema

Defined in `prisma/schema.prisma`:

- **Admin** — wedding organizers who log in to the panel (`email`, `name`, `passwordHash`).
- **Family** — a household invited to the wedding. Carries a unique `accessToken` that guests will use to RSVP. Has optional `notes`.
- **FamilyMember** — a person within a family (`name`, `age`, `gender`). `onDelete: Cascade` from `Family`.
- **Gender** enum — `MALE | FEMALE | OTHER`.

RSVP, gifts, and guest-session data are **not yet modeled** — they will be added as those features land.

### Authentication Flow

- Admin-only. Guests do not log in; they will use the family `accessToken` on public routes (not implemented yet).
- NextAuth v5 Credentials provider validates email/password against `Admin.passwordHash` (bcryptjs).
- JWT strategy stores the admin `id` in `token.sub` and exposes it as `session.user.id`.
- **Edge-safe config split**: `src/auth.config.ts` holds the shared (edge-compatible) config; `src/auth.ts` attaches the Credentials provider + Prisma lookup (Node-only, uses bcryptjs). `src/middleware.ts` imports only `auth.config.ts` so the middleware bundle stays small and doesn't pull bcryptjs.
- The initial admin is created by `prisma/seed.ts` from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` / `ADMIN_SEED_NAME`.

### Access Control

- Any route under `/admin/*` is gated by `src/middleware.ts`. Unauthenticated requests are redirected to `/admin/login?callbackUrl=<path>`.
- Already-authenticated visits to `/admin/login` are redirected to `/admin`.
- Server Actions that mutate data call `ensureAdmin()` (`src/app/admin/families/actions.ts`) before touching the DB.

### Route Structure

- `/` — public landing page (placeholder) with a link to the admin area.
- `/admin` — admin dashboard (family and member counts). Protected.
- `/admin/login` — admin login form (server action `loginAction` calls `signIn("credentials")`).
- `/admin/families` — list of families with name, member count, token.
- `/admin/families/new` — create form (family + N members, generates token on save).
- `/admin/families/[id]` — edit family + members, copy/regenerate token, delete (danger zone).
- `/api/auth/[...nextauth]` — NextAuth route handler (`GET`/`POST` from `@/auth`).

### Post-Authentication Redirects

- After login, users are redirected to the `callbackUrl` query param if present, otherwise to `/admin`.

### Key Files

- `prisma/schema.prisma` — data model.
- `prisma/seed.ts` — seeds the initial admin from env vars.
- `src/auth.ts` — full NextAuth instance (Node runtime).
- `src/auth.config.ts` — shared, edge-safe NextAuth config.
- `src/middleware.ts` — protects `/admin/*`.
- `src/lib/prisma.ts` — Prisma Client singleton (prevents re-instantiation in dev).
- `src/lib/token.ts` — `generateAccessToken(length)` — random string using an unambiguous alphabet (no `0/O/1/I`).
- `src/app/layout.tsx` — root layout (Tailwind + `pt-BR` lang).
- `src/app/admin/layout.tsx` — admin shell (sidebar, logout server action).
- `src/app/admin/families/actions.ts` — server actions: `createFamilyAction`, `updateFamilyAction`, `regenerateTokenAction`, `deleteFamilyAction`. All guarded by `ensureAdmin()`.
- `src/app/admin/families/FamilyForm.tsx` — client component with dynamic member rows, uses `useFormState` + `useFormStatus` from `react-dom` (React 18).
- `src/app/admin/families/[id]/TokenCard.tsx` — client component for copying and regenerating the family access token.

### Environment Variables Required

See `.env.example`.

- `DATABASE_URL` — PostgreSQL connection string. Use `localhost:5432` when running locally, `db:5432` inside Docker Compose (the compose file already sets this for the `app` service).
- `AUTH_SECRET` — JWT encryption secret. Generate with `openssl rand -base64 32`.
- `AUTH_TRUST_HOST` — set to `"true"` in non-standard hosting environments (required by NextAuth v5 when not on localhost).
- `ADMIN_SEED_EMAIL` — email of the admin created by `prisma/seed.ts`.
- `ADMIN_SEED_PASSWORD` — password for that admin (change before production).
- `ADMIN_SEED_NAME` — display name (default `Admin`).

### Development Patterns

- **Server Actions** are the default for mutations. Validate input with Zod, call `ensureAdmin()`, then mutate via Prisma, then `revalidatePath(...)` and optionally `redirect(...)`.
- **React 18**, not 19: use `useFormState` / `useFormStatus` from `react-dom`, not `useActionState` from `react`.
- **Prisma Client** is a singleton — import from `@/lib/prisma`, never `new PrismaClient()` in app code.
- **Edge runtime boundary**: anything imported by `src/middleware.ts` must be edge-safe. Do not import bcryptjs or other Node-only modules into `auth.config.ts`.
- **Access tokens** come from `generateAccessToken()` only. Never roll your own alphabet — the current one avoids visually ambiguous characters for guests reading it aloud.
- **Styling**: Tailwind utility classes, stone palette, `font-serif` for display text. No component library.
- **Language**: UI copy is in Portuguese (pt-BR).

## Conventions

- Absolute imports via the `@/` alias (configured in `tsconfig.json`) — avoid long relative paths (`../../../`).
- Naming: PascalCase for Prisma models and React components; camelCase for functions and variables in code.
- Database schema: follow Prisma's defaults (camelCase in both the schema and the columns). Only use `@map` / `@@map` when there's a concrete reason.
- Input validation with **Zod** at the Server Action boundary — never trust `FormData` directly.
- **Protected Server Actions** under `/admin/*` always call `ensureAdmin()` before touching Prisma.
- After any mutation, call `revalidatePath(...)` to invalidate the App Router cache.
- UI copy is always in **pt-BR**. User-facing error messages are also in pt-BR.
- **Styling**: Tailwind only (`stone` palette, `font-serif` for headings). No MUI/shadcn/styled-components.
- **Commits**: short imperative subject (e.g. *"Add CLAUDE.md"*, *"Switch Docker images to node:22-slim"*); optional body explaining the *why*.
- New environment variables must appear in `.env.example` with a safe placeholder **and** be documented in the *Environment Variables Required* section.
- Keep the `Makefile` as the single source of truth for dev commands — if you add a new script, add a matching target.

## Prohibitions

- **NEVER** use `any` in TypeScript — prefer `unknown` with narrowing, or define an explicit type.
- **NEVER** instantiate `new PrismaClient()` in application code — always use the singleton from `@/lib/prisma`.
- **NEVER** import `bcryptjs` (or any Node-only module) in `src/auth.config.ts` or anything reachable from `src/middleware.ts` — it breaks the edge bundle.
- **NEVER** use `useActionState` from `react` — we're on React 18; use `useFormState` / `useFormStatus` from `react-dom`.
- **NEVER** roll your own token alphabet — use `generateAccessToken()` from `@/lib/token`.
- **NEVER** commit `.env` or any file containing secrets (`AUTH_SECRET`, production credentials, etc.). Only `.env.example` belongs in the repo.
- **NEVER** add a component library (MUI, shadcn, Chakra, etc.) — the stack is plain Tailwind.
- **NEVER** expose a family's `accessToken` on public routes outside the official RSVP flow.
- **NEVER** switch to `prisma migrate` without agreeing first — while the schema is young the convention is `prisma db push`.
- **NEVER** use `git commit --no-verify` or skip hooks/linters to "make the build pass" — fix the root cause.
- **NEVER** write UI copy in English — every user-facing string is in pt-BR.
- **NEVER** run `make db-reset` or `make clean` against a shared environment without agreeing first — both are destructive.

## Maintaining This File

`CLAUDE.md` is the canonical guide for anyone — human or agent — working in this repo. Keep it in sync with the code as the project evolves:

- When you add, change, or remove a model, route, env var, Make target, convention, or prohibition, update the matching section **in the same PR**.
- When a feature listed as "not yet shipped" lands, move it from that note into the appropriate section (Schema, Routes, Authentication Flow, etc.).
- Treat this file as code, not documentation that drifts. PRs that change behavior without updating `CLAUDE.md` should be flagged in review.
