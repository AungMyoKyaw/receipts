BUN ?= bun
CARGO ?= cargo
DEV_PORT ?= 1420

.PHONY: help dev run stop web preview build tauri-build check test test-timezones test-native fmt fmt-check lint validate

help: ## Show available commands
	@awk -F '## ' '/^[a-zA-Z_-]+:.*## / { target = $$1; sub(/:.*/, "", target); printf "  make %-16s %s\n", target, $$2 }' Makefile

dev: ## Run native Tauri app in development mode
	$(BUN) run tauri dev

run: ## Build and open standalone local app (no dev server required)
	$(BUN) run tauri build --debug --bundles app
	open "src-tauri/target/debug/bundle/macos/Receipts.app"

stop: ## Stop this project's Vite dev server
	@pid=$$(lsof -tiTCP:$(DEV_PORT) -sTCP:LISTEN); \
	if [ -z "$$pid" ]; then echo "No dev server listening on port $(DEV_PORT)"; \
	elif ps -p "$$pid" -o command= | grep -F "$(CURDIR)" >/dev/null; then kill $$pid && echo "Stopped dev server (pid $$pid)"; \
	else echo "Port $(DEV_PORT) is used by another process (pid $$pid); not stopping it" >&2; exit 1; fi

web: ## Run browser-only Vite development server
	$(BUN) run dev

preview: ## Preview production web build
	$(BUN) run preview

build: ## Build web frontend
	$(BUN) run build

tauri-build: ## Build native Tauri application
	$(BUN) run tauri build

check: ## Run Svelte and TypeScript checks
	$(BUN) run check

test: ## Run Bun unit tests
	$(BUN) test tests

test-timezones: ## Run unit tests across UTC, New York, and Yangon
	TZ=UTC $(BUN) test tests
	TZ=America/New_York $(BUN) test tests
	TZ=Asia/Yangon $(BUN) test tests

test-native: ## Run Rust unit tests
	$(CARGO) test --manifest-path src-tauri/Cargo.toml --lib

fmt: ## Format Rust code
	$(CARGO) fmt --manifest-path src-tauri/Cargo.toml

fmt-check: ## Check Rust formatting
	$(CARGO) fmt --manifest-path src-tauri/Cargo.toml --check

lint: ## Run Rust Clippy with warnings denied
	$(CARGO) clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

validate: check test-timezones test-native fmt-check lint build ## Run full validation suite
