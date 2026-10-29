# Contributing

Contributions to degree-audit are welcome. degree-audit is a client-side web tool
that reads a university PDF transcript and visualizes graduation-requirement
progress. A shared Rust core (`crates/*`) is compiled both natively (CLI) and to
WASM (`crates/audit-wasm`) and driven from a SvelteKit + `adapter-static` frontend,
deployed to GitHub Pages. Everything runs in the browser — no upload, no storage.

## Setup

The toolchain is pinned via [mise](https://mise.jdx.dev/) (`.mise.toml`); tasks run
through [just](https://github.com/casey/just). The Rust toolchain itself is owned by
`rust-toolchain.toml`, and the canonical web build path is Docker (Dockerfile /
docker-compose); the just recipes are the Docker-free local equivalents.

```
mise install         # install the pinned tools (bun, node, just, wasm-pack, …)
just install-tools   # convenience wrapper around `mise install`
just install-hooks   # install the lefthook git hooks
```

Declare tools in `.mise.toml` and install via `mise install`; do not add them ad
hoc.

## Dev loop

```
just dev      # build WASM, then run the Vite dev server
just lint     # cargo fmt-check + clippy -D warnings + biome + typos + actionlint
just test     # Rust nextest + WASM boundary tests + web svelte-check/Vitest
just check    # lint + test (matches the lefthook pre-push hook)
just fmt      # cargo fmt + biome format + typos --write-changes
```

## MSRV

MSRV is **1.85** (edition 2024), declared in `Cargo.toml` (`rust-version`). The
toolchain actually pinned for the build lives in `rust-toolchain.toml`; bump the
MSRV deliberately and treat it as a minor version bump.

## Verification methodology

- **Native + WASM tests.** `just test-rust` runs the workspace under
  `cargo nextest`; `just test-wasm` runs the `#[wasm_bindgen]` boundary tests for
  `crates/audit-wasm` under Node (the `JsValue` shapes the frontend depends on);
  `just test-web` builds the WASM glue, then runs svelte-check and Vitest with the
  coverage gate.
- **E2E + a11y.** `just e2e` runs the Playwright suite with axe accessibility
  audits (consent dialog, dark theme, static-page checks).
- **Coverage.** `just cov` reports native line coverage via
  `cargo llvm-cov nextest` (excluding the wasm-bindgen surface).
- **Fuzzing.** The PDF parsers carry `cargo-fuzz` targets under `crates/*/fuzz`;
  `just fuzz <crate> <target>` runs one (CI fuzzes weekly, nightly-only).
- **Mutation testing.** [cargo-mutants](https://mutants.rs/) injects deliberate
  bugs into the product crates; a surviving mutant is an assertion the tests do not
  make. `just mutants` runs the sweep (scope in `mutants.toml`); pass
  `--in-diff <file>` for a changed-lines run. CI gates each PR on the diff.
- **TDD.** Write the failing test first, then make it pass.

## Commit / PR rules

- [Conventional Commits](https://www.conventionalcommits.org/) (`feat:` / `fix:` /
  `perf:` / `docs:` / `refactor:` / `test:` / `chore:` / `ci:` / `build:` /
  `deps:` / `style:` / `revert:`), enforced locally by
  [committed](https://github.com/crate-ci/committed) (`committed.toml`) via the
  lefthook `commit-msg` hook.
- **Squash-merge only.**
- Releases are cut by [release-please](https://github.com/googleapis/release-please):
  it opens a release PR that bumps the version + CHANGELOG from conventional
  commits, then on merge tags the release (`release-please-config.json` /
  `.release-please-manifest.json`). It is dormant until its GitHub App credentials
  are configured.

## Before pushing

- `just lint` and `just test` green (the `lefthook` pre-push hook runs them).
- Do not hand-edit the generated WASM glue under `src/lib/wasm/`; regenerate it via
  `just wasm-build`.
- Do not bypass hooks with `--no-verify`. If a hook fails, fix the cause.

## License

Contributions are accepted under the project's MIT license.
