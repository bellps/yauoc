.PHONY: help up down stop restart logs ps build build-prod shell db-shell db-push db-generate db-seed db-studio db-reset install lint typecheck clean prune

COMPOSE ?= docker compose
APP     ?= app
DB      ?= db

help: ## Mostra esta ajuda
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Sobe o stack de desenvolvimento (app + postgres)
	$(COMPOSE) up -d

down: ## Para e remove containers (mantém volumes)
	$(COMPOSE) down

stop: ## Apenas para os containers
	$(COMPOSE) stop

restart: ## Reinicia o app
	$(COMPOSE) restart $(APP)

logs: ## Segue os logs do app
	$(COMPOSE) logs -f $(APP)

ps: ## Lista os serviços
	$(COMPOSE) ps

build: ## Build da imagem de desenvolvimento (Dockerfile.dev)
	$(COMPOSE) build $(APP)

build-prod: ## Build da imagem de produção (Dockerfile)
	docker build -t yauoc:latest .

shell: ## Abre um shell no container do app
	$(COMPOSE) exec $(APP) sh

db-shell: ## Abre um psql no banco
	$(COMPOSE) exec $(DB) psql -U postgres -d yauoc

db-push: ## Aplica o schema Prisma no banco
	$(COMPOSE) exec $(APP) npx prisma db push

db-generate: ## Gera o Prisma Client
	$(COMPOSE) exec $(APP) npx prisma generate

db-seed: ## Cria o admin inicial a partir das variáveis de ambiente
	$(COMPOSE) exec $(APP) npm run db:seed

db-studio: ## Sobe o Prisma Studio (porta 5555)
	$(COMPOSE) exec $(APP) npx prisma studio --hostname 0.0.0.0

db-reset: ## Dropa e recria o schema (destrutivo)
	$(COMPOSE) exec $(APP) npx prisma db push --force-reset

install: ## npm install dentro do container
	$(COMPOSE) exec $(APP) npm install

lint: ## next lint
	$(COMPOSE) exec $(APP) npx next lint

typecheck: ## Type-check sem emitir
	$(COMPOSE) exec $(APP) npx tsc --noEmit

clean: ## Para e remove containers + volumes (destrutivo)
	$(COMPOSE) down -v

prune: ## Remove imagens/containers não usados do Docker
	docker system prune -f
