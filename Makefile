# All targets must be run from the repository root.
SHELL := /bin/bash

# The race detector needs a C toolchain; skip it when none is available
# (e.g. plain Git for Windows without gcc).
RACE := $(shell command -v gcc >/dev/null 2>&1 && echo -race)

.PHONY: help env db migrate migrate-psql migrate-status server frontend test test-integration lint up down

help: ## Show this help
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-18s %s\n", $$1, $$2}'

env: ## Create .env from the template if missing
	@test -f .env && echo ".env already exists" || (cp .env.example .env && \
	 echo "Created .env — now set DATABASE_PASSWORD and JWT_SECRET in it")

db: ## Start PostgreSQL only (development)
	docker compose -f docker-compose.dev.yml up -d

migrate: ## Apply database migrations (goose)
	./scripts/migrate.sh up

migrate-psql: ## Apply migrations with no downloads (offline fallback via psql)
	./scripts/migrate.sh up --psql

migrate-status: ## Show migration status
	./scripts/migrate.sh status

server: ## Run the Go API server
	cd apps && go run ./cmd/server

frontend: ## Run the Next.js dev server
	cd trade-market && bun dev

test: ## Run unit tests
	cd apps && go test $(RACE) ./...

test-integration: ## Run integration tests (starts PostgreSQL, creates a test DB)
	./scripts/test-integration.sh

lint: ## Vet backend and lint frontend
	cd apps && go vet ./...
	cd trade-market && bun run lint

up: ## Build and run the full stack in Docker
	docker compose up --build

down: ## Stop the full stack
	docker compose down
