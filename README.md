# γάμος

Aplicação web para organizarmos nosso casamento: cadastro de famílias,
confirmação de presença (RSVP), lista de presentes e painel administrativo.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Prisma** + **PostgreSQL**
- **NextAuth v5** (credenciais — admin)
- **Tailwind CSS**
- **Zod** para validação
- **bcryptjs** para hashing de senha

## Scope desta branch

Esta branch (`claude/wedding-app-family-management-ygMTy`) implementa a primeira
fatia do produto:

- Setup inicial do projeto (Next.js + Prisma + Tailwind + NextAuth).
- Autenticação de administrador (login/logout + middleware protegendo `/admin`).
- **Family Management**: CRUD de famílias com múltiplos membros (nome, idade,
  gênero) e geração/regeneração de token de acesso único por família.
- Landing page mínima com link para o painel.

Próximas branches cobrirão RSVP, lista de presentes, jobs em background e a
landing page final.

## Como rodar com Docker (recomendado)

Requisitos: Docker e Docker Compose.

```bash
# 1. (Opcional) crie um .env na raiz para sobrescrever variáveis
cp .env.example .env

# 2. Suba o stack (app + postgres)
make up

# 3. Na primeira vez, crie o schema e o admin inicial
make db-push
make db-seed

# 4. Acompanhe os logs
make logs
```

Acesse `http://localhost:3000` (landing) e `http://localhost:3000/admin` para
entrar com as credenciais semeadas (`ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`,
defaults: `admin@yauoc.local` / `change-me`).

Rode `make help` para ver todos os targets disponíveis (`db-shell`, `db-studio`,
`shell`, `clean`, etc.).

## Como rodar sem Docker

Requisitos: Node.js 20+ e PostgreSQL.

```bash
npm install
cp .env.example .env
# edite DATABASE_URL, AUTH_SECRET (openssl rand -base64 32),
# ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD

npm run db:push
npm run db:generate
npm run db:seed
npm run dev
```

## Estrutura

```
prisma/
  schema.prisma        # Admin, Family, FamilyMember
  seed.ts              # cria o admin inicial a partir do .env
src/
  auth.ts              # NextAuth (Credentials, Prisma)
  auth.config.ts       # config compartilhado (edge-safe) para middleware
  middleware.ts        # protege /admin/*
  lib/
    prisma.ts          # singleton do Prisma Client
    token.ts           # gerador de access token
  app/
    page.tsx           # landing
    admin/
      layout.tsx       # sidebar + logout
      page.tsx         # dashboard (contagens)
      login/           # página e action de login
      families/        # listagem, criação, edição, deleção
        [id]/          # detalhe + regenerar token
        new/           # criar
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` / `npm start` — build de produção
- `npm run db:push` — aplica o schema no banco
- `npm run db:generate` — gera o Prisma Client
- `npm run db:seed` — cria o admin inicial
- `npm run db:studio` — Prisma Studio

## Docker

- `Dockerfile` — build multi-stage de produção (Next.js `standalone`).
- `docker-compose.yml` — stack de desenvolvimento com Postgres 16 + app em
  Node 22 com hot reload via bind mount.
- `Makefile` — atalhos (`up`, `down`, `logs`, `db-push`, `db-seed`, `shell`,
  `db-shell`, `clean`, …). Rode `make help` para a lista completa.
