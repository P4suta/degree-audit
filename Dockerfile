# syntax=docker/dockerfile:1.7
# Single source of truth for the Bun version, dependency install, and the
# check / lint / test / build targets. Local (docker compose), devcontainer,
# CI and Pages builds all invoke this Dockerfile by switching the target.

# Keep in sync with .mise.toml `bun` so the Docker and mise/just paths use the
# same Bun.
ARG BUN_VERSION=1.3.14

FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app
ENV CI=1

FROM base AS deps
COPY package.json bun.lock .npmrc ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile

FROM deps AS source
COPY . .
# Compile the Paraglide messages (gitignored output) from the local plugin so
# every downstream target resolves $lib/paraglide without a network fetch.
RUN bun run paraglide:compile
RUN bun run prepare

FROM source AS check
RUN bun run check

FROM source AS lint
RUN bun run lint

FROM source AS test
RUN bun run test:coverage

FROM source AS build
ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}
RUN bun run build

# Export-only stage carrying just the build artifacts. Pull the SvelteKit static
# output to the host with:
# `docker buildx build --target build-output --output type=local,dest=./build .`
FROM scratch AS build-output
COPY --from=build /app/build /
