set shell := ["bash", "-cu"]

# List recipes.
default:
    @just --list --unsorted

# === Build / run ===

# Replaces the old `package.json` wasm:build (wasm-pack + cp); the generated glue
# is gitignored and regenerated here and in CI (no vendored copy).
# --out-dir is crate-root relative, hence ../../.
# Build the Rust core to WASM into src/lib/wasm.
wasm-build:
    wasm-pack build crates/audit-wasm --target web --out-dir ../../src/lib/wasm --out-name degree_audit

# Dev server (builds WASM first so $lib/wasm types resolve).
dev: wasm-build
    bun install && bun run dev

# CI/Pages use Docker; this is the Docker-free local equivalent.
# BASE_PATH mirrors the deploy subpath when set.
# Production web build (SvelteKit static).
build: wasm-build
    bun install --frozen-lockfile && bun run build

# === Test ===

test: test-rust test-wasm test-web

# Rust tests via nextest.
test-rust:
    cargo nextest run --workspace

# WASM boundary tests (JsValue shapes) in Node — needs wasm-pack.
test-wasm:
    wasm-pack test --node crates/audit-wasm

# Builds wasm first so svelte-check can resolve the generated $lib/wasm types.
# Web svelte-check + Vitest with coverage (mirrors the CI web job).
test-web: wasm-build
    bun install --frozen-lockfile && bun run check && bun run test:coverage

# Native line coverage via nextest (excludes the wasm-bindgen surface).
cov:
    cargo llvm-cov nextest --workspace --exclude audit-wasm --summary-only

# Fuzz targets live out-of-workspace under crates/*/fuzz (added in a later phase).
# e.g. `just fuzz pdf-glyphs fuzz_extract_glyphs`.
# Continuous fuzzing (nightly + cargo-fuzz).
fuzz CRATE TARGET *ARGS:
    cd crates/{{CRATE}}/fuzz && cargo +nightly fuzz run {{TARGET}} -- -max_total_time=60 {{ARGS}}

# Scope lives in mutants.toml. Pass `--in-diff <file>` for a changed-lines run.
# Mutation testing (weekly in CI, slow): do the tests kill injected bugs?
mutants *ARGS:
    cargo mutants --timeout 60 {{ARGS}}

# === Format / lint ===

fmt:
    cargo fmt
    bun run format
    -typos --write-changes 2>/dev/null || echo "(typos: install via mise, or `just install-tools`)"

lint: lint-rust lint-web lint-typos lint-actions

lint-rust:
    cargo clippy --workspace --all-targets -- -D warnings
    cargo fmt --all --check

lint-web:
    bun run lint

lint-typos:
    typos

lint-actions:
    actionlint

# CI-equivalent checks (matches lefthook pre-push).
check: lint test

# === Setup ===

install-tools:
    @if command -v mise > /dev/null; then \
      mise install; \
    else \
      echo "→ mise not found: install from https://mise.jdx.dev/ and retry"; \
      exit 1; \
    fi

install-hooks:
    lefthook install
