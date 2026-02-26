# Makefile for Toonflow Docker management

# Default environment
ENV ?= local

# Docker Compose file selection
ifeq ($(ENV),online)
	COMPOSE_FILE = docker/docker-compose.yml
	SERVICE_NAME = toonflow
else
	COMPOSE_FILE = docker/docker-compose.local.yml
	SERVICE_NAME = toonflow-local
endif

# Build arguments
GIT ?= github
TAG ?=
BRANCH ?=

# Default target
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help message
	@echo "Toonflow Docker Management Commands"
	@echo "===================================="
	@echo ""
	@echo "Usage: make [target] [ENV=local|online] [GIT=github|gitee] [TAG=version] [BRANCH=branch]"
	@echo ""
	@echo "Environment:"
	@echo "  ENV=local    Use local build (default, requires local source code)"
	@echo "  ENV=online   Use online build (pull from GitHub/Gitee)"
	@echo ""
	@echo "Build Arguments (for ENV=online):"
	@echo "  GIT=github   Use GitHub as source (default)"
	@echo "  GIT=gitee    Use Gitee as source (faster in China)"
	@echo "  TAG=v1.0.6   Specify version tag"
	@echo "  BRANCH=dev   Specify branch"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

.PHONY: build
build: ## Build Docker images
	@if [ "$(ENV)" = "online" ]; then \
		if [ -n "$(TAG)" ]; then \
			TAG=$(TAG) docker-compose -f $(COMPOSE_FILE) build; \
		elif [ -n "$(BRANCH)" ]; then \
			BRANCH=$(BRANCH) docker-compose -f $(COMPOSE_FILE) build; \
		else \
			docker-compose -f $(COMPOSE_FILE) build; \
		fi \
	else \
		docker-compose -f $(COMPOSE_FILE) build; \
	fi

.PHONY: force-build
force-build: ## Force build Docker images without cache
	@if [ "$(ENV)" = "online" ]; then \
		if [ -n "$(TAG)" ]; then \
			TAG=$(TAG) docker-compose -f $(COMPOSE_FILE) build --no-cache; \
		elif [ -n "$(BRANCH)" ]; then \
			BRANCH=$(BRANCH) docker-compose -f $(COMPOSE_FILE) build --no-cache; \
		else \
			docker-compose -f $(COMPOSE_FILE) build --no-cache; \
		fi \
	else \
		docker-compose -f $(COMPOSE_FILE) build --no-cache; \
	fi

.PHONY: up
up: ## Start all services
	docker-compose -f $(COMPOSE_FILE) up -d

.PHONY: down
down: ## Stop all services
	docker-compose -f $(COMPOSE_FILE) down

.PHONY: restart
restart: down up ## Restart all services

.PHONY: logs
logs: ## Show logs for all services
	docker-compose -f $(COMPOSE_FILE) logs -f

.PHONY: ps
ps: ## Show status of all services
	docker-compose -f $(COMPOSE_FILE) ps

.PHONY: shell
shell: ## Access container shell
	docker exec -it $(SERVICE_NAME) bash

.PHONY: rebuild
rebuild: down build up ## Rebuild and restart services

.PHONY: clean
clean: ## Clean up Docker images and volumes
	docker-compose -f $(COMPOSE_FILE) down -v
	docker system prune -f

.PHONY: config
config: ## Validate and show docker-compose configuration
	docker-compose -f $(COMPOSE_FILE) config

# Online deployment specific commands
.PHONY: deploy-github
deploy-github: ENV=online GIT=github ## Deploy using GitHub source
deploy-github: build up

.PHONY: deploy-gitee
deploy-gitee: ENV=online GIT=gitee ## Deploy using Gitee source (faster in China)
deploy-gitee: build up

.PHONY: deploy-version
deploy-version: ENV=online ## Deploy specific version (usage: make deploy-version TAG=v1.0.6)
deploy-version: build up

.PHONY: deploy-branch
deploy-branch: ENV=online ## Deploy specific branch (usage: make deploy-branch BRANCH=dev GIT=gitee)
deploy-branch: build up

# Local development specific commands
.PHONY: dev-build
dev-build: ENV=local ## Build with local source code
dev-build: build

.PHONY: dev-up
dev-up: ENV=local ## Start local development environment
dev-up: up

.PHONY: dev-restart
dev-restart: ENV=local ## Restart local development environment
dev-restart: down up

.PHONY: dev-rebuild
dev-rebuild: ENV=local ## Rebuild and restart local environment
dev-rebuild: down build up

.PHONY: dev-logs
dev-logs: ENV=local ## Show local development logs
dev-logs: logs

.PHONY: dev-shell
dev-shell: ENV=local ## Access local container shell
dev-shell: shell

# Quick start commands
.PHONY: start
start: ## Quick start (default: local build)
	@echo "Starting Toonflow with local build..."
	$(MAKE) dev-build
	$(MAKE) dev-up

.PHONY: start-online
start-online: ## Quick start with online build (GitHub)
	@echo "Starting Toonflow with online build from GitHub..."
	$(MAKE) deploy-github

.PHONY: start-gitee
start-gitee: ## Quick start with online build (Gitee, faster in China)
	@echo "Starting Toonflow with online build from Gitee..."
	$(MAKE) deploy-gitee

# Health check
.PHONY: health
health: ## Check service health
	@echo "Checking service health..."
	@docker-compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "Testing API endpoint..."
	@curl -f http://localhost:60000/ 2>/dev/null && echo "✓ API is healthy" || echo "✗ API health check failed"

# Show URLs
.PHONY: urls
urls: ## Show access URLs
	@echo "Toonflow Access URLs:"
	@echo "====================="
	@echo "Frontend (Nginx): http://localhost:80"
	@echo "Backend API:     http://localhost:60000"
	@echo ""
	@echo "Default login:"
	@echo "  Username: admin"
	@echo "  Password: admin123"
