DC := $(shell command -v docker-compose >/dev/null 2>&1 && echo "docker-compose" || echo "docker compose")
DCE = $(DC) exec
DCR = $(DC) run --rm

.PHONY: help status init install-frontend install-backend build build-frontend build-backend build-prod build-prod-frontend build-prod-backend start start-frontend start-backend start-worker start-prod stop stop-prod restart restart-frontend restart-backend restart-worker restart-prod rebuild rebuild-frontend rebuild-backend rebuild-prod rebuild-prod-frontend rebuild-prod-backend create-super-user change-password migrate makemigrations seed db-shell db-reset logs logs-backend logs-worker logs-frontend logs-prod shell run-image-resizing bash-backend bash-frontend clean-media clean test test-backend test-frontend test-backend-watch test-frontend-watch coverage

.DEFAULT_GOAL := help

## ─── Setup & Init ────────────────────────────────────────

help: ## Show available commands
	@echo "PixelForge — Makefile"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

_ensure-env:
	@if [ ! -f .env ]; then \
		echo "→ Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "  Edit .env with your settings before running 'make start'"; \
	fi

status: _ensure-env ## Show status of all Pixelforge containers
	$(DC) ps

init: ## Copy .env.example → .env, create media/, build images
	@echo "-> Copying .env.example to .env..."
	@cp -n .env.example .env || echo "  .env already exists, skipping."
	@echo "-> Creating media/ directory..."
	@mkdir -p media
	@echo "-> Building Docker images (installs deps inside containers)..."
	@$(DC) build
	@echo ""
	@echo "  Edit .env with your settings, then run 'make start'"

install-frontend: ## Install frontend dependencies (npm install)
	@cd frontend && npm install

install-backend: ## Install backend dependencies (pip install)
	@cd backend && pip install -r requirements.txt

## ─── Build ────────────────────────────────────────────────

build: ## Build all dev services
	$(DC) build

build-frontend: ## Build frontend dev image (uses cached node_modules layer if packages unchanged)
	# node_modules are installed in a separate deps stage.
	# npm ci only re-runs when package.json or package-lock.json changes.
	# Unrelated source file changes do NOT invalidate the node_modules layer.
	$(DC) build frontend

build-backend: ## Build backend dev service only
	$(DC) build backend

build-prod: ## Build all production services
	$(DC) -f docker-compose.prod.yml build

build-prod-frontend: ## Build frontend production image
	$(DC) -f docker-compose.prod.yml build frontend

build-prod-backend: ## Build backend for production only
	$(DC) -f docker-compose.prod.yml build backend

## ─── Start / Stop ────────────────────────────────────────

start: ## Start all dev services
	$(DC) up -d
	@echo ""
	@echo "PixelForge is running:"
	@echo "  Frontend: http://localhost:4300"
	@echo "  API:      http://localhost:8383"
	@echo "  Admin:    http://localhost:8383/admin"
	@echo ""
	@echo "  (the frontend may take a few seconds to compile)"
	@echo "  Logs: make logs"
	@echo "  Stop: make stop"

start-frontend: ## Start frontend dev service only
	$(DC) up -d frontend

start-backend: ## Start backend, db, and redis
	$(DC) up -d backend db redis

start-worker: ## Start Celery worker only
	$(DC) up -d worker

start-prod: ## Start all production services
	$(DC) -f docker-compose.prod.yml up -d

stop: ## Stop all dev services
	$(DC) down

stop-prod: ## Stop all production services
	$(DC) -f docker-compose.prod.yml down

## ─── Restart ─────────────────────────────────────────────

restart: ## Restart all dev services
	$(DC) restart

restart-frontend: ## Restart frontend container only
	$(DC) restart frontend

restart-backend: ## Restart backend container only
	$(DC) restart backend

restart-worker: ## Restart worker container only
	$(DC) restart worker

restart-prod: ## Restart all production containers
	$(DC) -f docker-compose.prod.yml restart

## ─── Rebuild (stop + build + start) ──────────────────────

rebuild: ## Full dev rebuild
	$(DC) down && $(DC) build && $(DC) up -d

rebuild-frontend: ## Rebuild frontend only
	$(DC) stop frontend && $(DC) build frontend && $(DC) up -d frontend

rebuild-backend: ## Rebuild backend only
	$(DC) stop backend && $(DC) build backend && $(DC) up -d backend

rebuild-prod: ## Full production rebuild
	$(DC) -f docker-compose.prod.yml down && $(DC) -f docker-compose.prod.yml build && $(DC) -f docker-compose.prod.yml up -d

rebuild-prod-frontend: ## Rebuild frontend for production only
	$(DC) -f docker-compose.prod.yml stop frontend && $(DC) -f docker-compose.prod.yml build frontend && $(DC) -f docker-compose.prod.yml up -d frontend

rebuild-prod-backend: ## Rebuild backend for production only
	$(DC) -f docker-compose.prod.yml stop backend && $(DC) -f docker-compose.prod.yml build backend && $(DC) -f docker-compose.prod.yml up -d backend

## ─── Database ─────────────────────────────────────────────

migrate: ## Run Django migrations inside backend container
	$(DCE) backend python manage.py migrate

makemigrations: ## Generate new Django migrations
	$(DCE) backend python manage.py makemigrations

seed: ## Load ResizePreset fixtures
	$(DCE) backend python manage.py seed_presets

create-super-user: ## Create a Django superuser (pass ARGS="--noinput ..." for scripts)
	@if $(DCE) backend true >/dev/null 2>&1; then \
		$(DCE) -e DJANGO_SUPERUSER_PASSWORD backend python manage.py createsuperuser $(ARGS); \
	else \
		echo "→ Backend is not running; starting a temporary container..."; \
		$(DCR) -e DJANGO_SUPERUSER_PASSWORD backend python manage.py createsuperuser $(ARGS); \
	fi

change-password: ## Change a user's password (usage: make change-password EMAIL=user@example.com)
	@if [ -z "$(EMAIL)" ]; then \
		printf "  User email: "; \
		read email; \
	else \
		email="$(EMAIL)"; \
	fi; \
	if [ -z "$$email" ]; then \
		echo "  Email is required."; \
		exit 1; \
	fi; \
	if $(DCE) backend true >/dev/null 2>&1; then \
		$(DCE) backend python manage.py changepassword "$$email"; \
	else \
		echo "→ Backend is not running; starting a temporary container..."; \
		$(DCR) backend python manage.py changepassword "$$email"; \
	fi

db-shell: ## Open psql shell in db container
	$(DCE) db psql -U pixelforge pixelforge

db-reset: ## Drop and recreate dev database (with confirmation)
	@read -p "  This will DELETE all data. Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		$(DCE) db psql -U pixelforge -d postgres -c "DROP DATABASE IF EXISTS pixelforge; CREATE DATABASE pixelforge;"; \
		echo "Database reset."; \
	else \
		echo "Cancelled."; \
	fi

## ─── Logs ─────────────────────────────────────────────────

logs: ## Tail all dev service logs
	$(DC) logs -f

logs-backend: ## Tail backend logs only
	$(DC) logs -f backend

logs-worker: ## Tail worker logs only
	$(DC) logs -f worker

logs-frontend: ## Tail frontend logs only
	$(DC) logs -f frontend

logs-prod: ## Tail all production logs
	$(DC) -f docker-compose.prod.yml logs -f

## ─── Utilities ───────────────────────────────────────────

shell: ## Open Django shell in backend container
	$(DCE) backend python manage.py shell

run-image-resizing: ## Run resize job manually (usage: make run-image-resizing JOB_ID=<uuid>)
	$(DCE) backend python manage.py shell -c "from apps.images.tasks import process_resize_job; process_resize_job('$(JOB_ID)')"

bash-backend: ## Bash shell in backend container
	$(DCE) backend bash

bash-frontend: ## Shell in frontend container
	$(DCE) frontend sh

MODE ?= orphan-media
DRY_RUN ?= 0
PRUNE_RECORDS ?= 0

clean-media: ## Remove orphan/all media and prune broken DB records: MODE=orphan-media|all-media|prune-records, PRUNE_RECORDS=1, DRY_RUN=1 to preview
	@mode="$(MODE)"; \
	dry_run="$(DRY_RUN)"; \
	prune_records="$(PRUNE_RECORDS)"; \
	log=".media-clean.log"; \
	case "$$mode" in orphan-media|all-media|prune-records) ;; *) echo "  Invalid MODE=$$mode (use orphan-media, all-media, or prune-records)"; exit 1;; esac; \
	extra=""; \
	if [ "$$prune_records" = "1" ] && [ "$$mode" != "prune-records" ]; then extra="--prune-records"; fi; \
	if [ "$$mode" = "prune-records" ]; then prune_records=1; fi; \
	run_clean() { \
		if $(DCE) -T backend true </dev/null >/dev/null 2>&1; then \
			$(DCE) -T backend python manage.py clean_media "$$@" </dev/null; \
		else \
			echo "→ Backend is not running; starting a temporary container..."; \
			$(DCR) -T backend python manage.py clean_media "$$@" </dev/null; \
		fi; \
	}; \
	echo "=== $$(date -u +%Y-%m-%dT%H:%M:%SZ) clean-media mode=$$mode prune_records=$$prune_records user=$$(whoami) ===" | tee -a "$$log"; \
	if [ "$$dry_run" = "1" ]; then \
		tmp=$$(mktemp); \
		run_clean "$$mode" $$extra --dry-run > "$$tmp" 2>&1; \
		status=$$?; \
		cat "$$tmp" | tee -a "$$log"; \
		rm -f "$$tmp"; \
		exit $$status; \
	fi; \
	preview=$$(mktemp); \
	run_clean "$$mode" $$extra --dry-run > "$$preview" 2>&1; \
	status=$$?; \
	if [ $$status -ne 0 ]; then \
		cat "$$preview" | tee -a "$$log"; \
		rm -f "$$preview"; \
		exit $$status; \
	fi; \
	cat "$$preview"; \
	if grep -q "Nothing to delete." "$$preview"; then \
		cat "$$preview" | tee -a "$$log" >/dev/null; \
		rm -f "$$preview"; \
		exit 0; \
	fi; \
	printf "  Continue with deletion? [y/N] "; \
	read confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		cat "$$preview" | tee -a "$$log" >/dev/null; \
		rm -f "$$preview"; \
		tmp=$$(mktemp); \
		run_clean "$$mode" $$extra --yes > "$$tmp" 2>&1; \
		status=$$?; \
		cat "$$tmp" | tee -a "$$log"; \
		rm -f "$$tmp"; \
		exit $$status; \
	else \
		cat "$$preview" | tee -a "$$log" >/dev/null; \
		rm -f "$$preview"; \
		echo "  Cancelled." | tee -a "$$log"; \
	fi

clean: ## Stop containers, remove volumes, clean media (with confirmation)
	@read -p "  This will DELETE all data and containers. Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		$(DC) down -v; \
		rm -rf media/*; \
		echo "Clean complete."; \
	else \
		echo "Cancelled."; \
	fi

## ─── Testing ──────────────────────────────────────────────

test: ## Run all tests (backend + frontend)
	@echo "===== BACKEND TESTS ====="
	@$(MAKE) test-backend || exit 1
	@echo ""
	@echo "===== FRONTEND TESTS ====="
	@$(MAKE) test-frontend || exit 1
	@echo ""
	@echo "All tests passed."

test-backend: _ensure-env ## Run backend tests with pytest and coverage
	@echo "→ Running backend tests..."
	@$(DCE) backend pytest --cov=apps --cov-report=term-missing --cov-fail-under=70 2>/dev/null \
		|| $(DCR) backend pytest --cov=apps --cov-report=term-missing --cov-fail-under=70 \
		|| (echo "Backend tests FAILED." && exit 1)

test-frontend: _ensure-env ## Run frontend tests with Vitest and coverage
	# Runs Vitest inside the frontend Docker container — mirrors make test-backend pattern.
	@echo "→ Running frontend tests..."
	@$(DCE) frontend npx vitest run --coverage 2>/dev/null \
		|| $(DCR) frontend npx vitest run --coverage \
		|| (echo "Frontend tests FAILED." && exit 1)

test-backend-watch: ## Watch mode for backend tests (TDD)
	@echo "→ Starting backend test watcher..."
	@$(DCE) backend ptw -- --cov=apps --cov-report=term-missing 2>/dev/null \
		|| $(DCR) backend ptw -- --cov=apps --cov-report=term-missing

test-frontend-watch: ## Watch mode for frontend tests (TDD)
	@echo "→ Starting frontend test watcher..."
	@$(DCE) frontend npx vitest --watch 2>/dev/null \
		|| $(DCR) frontend npx vitest --watch

coverage: ## Run all tests with coverage and print combined summary
	@echo "===== COVERAGE REPORT ====="
	@$(MAKE) test-backend
	@$(MAKE) test-frontend
	@echo "Coverage complete."
