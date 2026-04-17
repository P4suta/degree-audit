# syntax=docker/dockerfile:1.7
# 単一の真実のソース:
# - Bun バージョン
# - 依存インストール
# - check / lint / test / build すべての target を持つ
# ローカル (docker compose), devcontainer, CI, Pages ビルドは
# この Dockerfile を target 切替で呼び出すだけ。

ARG BUN_VERSION=1.3.12

FROM oven/bun:${BUN_VERSION}-slim AS base
WORKDIR /app
ENV CI=1

FROM base AS deps
COPY package.json bun.lock .npmrc ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile

FROM deps AS source
COPY . .
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

# build 成果物だけを持つ export 用 stage。
# `docker buildx build --target build-output --output type=local,dest=./build .`
# でホストの ./build に SvelteKit static 出力を取り出せる。
FROM scratch AS build-output
COPY --from=build /app/build /
