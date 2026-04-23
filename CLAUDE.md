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

## Convenções

- Imports absolutos com alias `@/` (configurado no `tsconfig.json`) — evite caminhos relativos longos (`../../../`).
- Nomes: PascalCase para modelos do Prisma e componentes React; camelCase para funções e variáveis em código.
- Esquema do banco: siga o default do Prisma (camelCase no schema e nas colunas). Só use `@map` / `@@map` se houver um motivo concreto.
- Validação de entrada com **Zod** no boundary das Server Actions — nunca confie direto no `FormData`.
- **Server Actions protegidas** em `/admin/*` sempre chamam `ensureAdmin()` antes de tocar no Prisma.
- Após qualquer mutação, chame `revalidatePath(...)` para invalidar o cache do App Router.
- Copy da UI sempre em **pt-BR**. Erros expostos ao usuário também em pt-BR.
- **Styling**: só Tailwind (paleta `stone`, `font-serif` para títulos). Sem MUI/shadcn/styled-components.
- **Commits**: sujeito no imperativo e curto (ex: *"Add CLAUDE.md"*, *"Switch Docker images to node:22-slim"*); corpo opcional explicando o *porquê*.
- Variáveis de ambiente novas precisam aparecer no `.env.example` com um placeholder seguro **e** ser documentadas na seção *Environment Variables Required*.
- Mantenha o `Makefile` como fonte única da verdade para comandos de dev — se você cria um script novo, adicione um target correspondente.

## Proibições

- **NUNCA** use `any` em TypeScript — prefira `unknown` com narrowing, ou crie um tipo explícito.
- **NUNCA** instancie `new PrismaClient()` em código de aplicação — use sempre o singleton de `@/lib/prisma`.
- **NUNCA** importe `bcryptjs` (ou qualquer módulo Node-only) em `src/auth.config.ts` ou em qualquer coisa alcançada por `src/middleware.ts` — quebra o bundle edge.
- **NUNCA** use `useActionState` do `react` — estamos no React 18, use `useFormState` / `useFormStatus` de `react-dom`.
- **NUNCA** role um alfabeto de token próprio — use `generateAccessToken()` de `@/lib/token`.
- **NUNCA** commite `.env` ou qualquer arquivo com segredos (`AUTH_SECRET`, credenciais de produção, etc.). Só `.env.example` entra no repositório.
- **NUNCA** adicione biblioteca de componentes (MUI, shadcn, Chakra, etc.) — a stack é Tailwind puro.
- **NUNCA** exponha o `accessToken` de uma família em rotas públicas fora do fluxo oficial de RSVP.
- **NUNCA** troque para `prisma migrate` sem combinar antes — enquanto o schema é jovem a convenção é `prisma db push`.
- **NUNCA** use `git commit --no-verify` nem pule hooks/linters para "fazer o build passar" — conserte a causa.
- **NUNCA** escreva UI em inglês — todo texto visível ao usuário é em pt-BR.
- **NUNCA** rode `make db-reset` ou `make clean` em ambiente compartilhado sem combinar — são destrutivos.

## Deployment

Production is containerized. The multi-stage `Dockerfile` builds a Next.js `standalone` image based on `node:22-slim` with `openssl` and `ca-certificates` (required so Prisma's schema engine detects the right libssl). The runner stage runs as a non-root `nextjs` user.

### Prerequisites

- Docker + Docker Compose (for dev and recommended for prod), or Node.js 20+ with a reachable Postgres 14+.
- A populated `.env` (see `.env.example`).

### Deployment Steps

1. **Prepare environment** — set `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`, `ADMIN_SEED_*`. For production, generate `AUTH_SECRET` with `openssl rand -base64 32`.
2. **Apply schema** — `npx prisma db push` (or `prisma migrate deploy` once migrations are introduced).
3. **Seed initial admin** — `npm run db:seed` (only needs to run once per environment).
4. **Build the image** — `make build-prod` (`docker build -t yauoc:latest .`).
5. **Run** — `docker run --env-file .env -p 3000:3000 yauoc:latest` (or your orchestrator of choice).

### Scope Notes

This repository is early-stage. Currently shipped: project bootstrap, admin auth, Family Management CRUD with unique access tokens. **Not yet shipped**: public RSVP flow, gift list, background jobs/notifications, final landing page. Those should land in separate branches/PRs and will extend the schema (likely adding `attending` on `FamilyMember`, `respondedAt`/`declinedAt` on `Family`, plus `Gift`/`GiftContribution` models).
