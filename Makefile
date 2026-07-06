# ============================================================================
# Artifact — Development Makefile
# ============================================================================
# Common tasks:
#   make dev            Start backend + frontend (default). Ctrl+C stops both.
#   make backend        Start just the Go backend
#   make frontend       Start just the Vite frontend
#   make test           Run all tests (backend + frontend)
#   make test-backend   Run just the Go tests
#   make test-frontend  Run just the frontend tests
#   make install        Install all dependencies
#   make clean          Remove build artifacts
#   make help           Show this list
# ============================================================================

# Load .env if present (MONGODB_URI, CLIENT_URL, ENV, etc.).
-include .env
export

FRONTEND_DIR := public/frontend

.DEFAULT_GOAL := dev

.PHONY: dev backend frontend test test-backend test-frontend install clean help

# ---- Development -----------------------------------------------------------

# Run backend and frontend in parallel. Output is prefixed with [be] / [fe]
# so you can tell them apart. Ctrl+C or `kill` on the parent process cleans
# both up via `kill 0` on the process group.
dev:
	@echo "==> Starting backend (:8080) and frontend (:5173)"
	@echo "==> Press Ctrl+C to stop both."
	@trap 'kill 0' EXIT INT TERM; \
		( cd $(FRONTEND_DIR) && npm run dev 2>&1 | sed 's/^/[fe] /' ) & \
		( go run . 2>&1 | sed 's/^/[be] /' ) & \
		wait

backend:
	@go run .

frontend:
	@cd $(FRONTEND_DIR) && npm run dev

# ---- Testing ---------------------------------------------------------------

test: test-backend test-frontend

test-backend:
	@echo "==> Running Go tests"
	@go test ./...

test-frontend:
	@echo "==> Running frontend tests"
	@cd $(FRONTEND_DIR) && npx vitest run

# ---- Setup -----------------------------------------------------------------

install:
	@echo "==> Installing Go dependencies"
	@go mod download
	@echo "==> Installing frontend dependencies"
	@cd $(FRONTEND_DIR) && npm install

# ---- Cleanup ---------------------------------------------------------------

clean:
	@echo "==> Cleaning frontend build artifacts"
	@cd $(FRONTEND_DIR) && rm -rf dist
	@echo "==> Running go clean"
	@go clean

# ---- Help ------------------------------------------------------------------

help:
	@echo "Available commands:"
	@echo "  make dev            Start backend + frontend (default)"
	@echo "  make backend        Start just the backend"
	@echo "  make frontend       Start just the frontend"
	@echo "  make test           Run all tests"
	@echo "  make test-backend   Run just backend tests"
	@echo "  make test-frontend  Run just frontend tests"
	@echo "  make install        Install all dependencies"
	@echo "  make clean          Remove build artifacts"
