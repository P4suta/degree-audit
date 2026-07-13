# 卒業要件判定ツール

[![CI](https://github.com/P4suta/degree-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/P4suta/degree-audit/actions/workflows/ci.yml)
[![Deploy](https://github.com/P4suta/degree-audit/actions/workflows/deploy.yml/badge.svg)](https://github.com/P4suta/degree-audit/actions/workflows/deploy.yml)

公開 URL: <https://p4suta.github.io/degree-audit/>

大学が発行する **PDF 成績表**を取り込み、**卒業要件の充足状況**と**卒業論文履修資格**を
可視化する非公式 Web ツール。学部・コース・入学年度は PDF から自動で読み取る。
ブラウザ内だけで動くクライアントサイド SPA（SvelteKit + adapter-static）で、
サーバーへのアップロードも永続保存もしない。

## 対応範囲

人文社会科学部 人文科学コース、令和 2〜5 年度（2020〜2023）入学生と令和 6 年度（2024）以降入学生。
それ以外の年度・学部・コースは未対応。

## 免責事項

個人が作成する**非公式**ツールであり、特定の大学・教育機関とは一切関係がなく、承認・推奨も受けていない。
現状有姿（AS IS）で提供し、正確性・完全性・最新性その他一切を保証せず、利用により生じた損害について
作成者は責任を負わない。大学の規程は改定されることがある。

**判定結果は参考情報にすぎない。** 卒業・履修の最終判断は、必ず最新の履修案内・所属学部の教務担当・
指導教員のいずれかで確認すること。卒業論文履修資格は大学の判定会議（年 2 回）が公式な判定機関となる。

入力データはブラウザタブ内のメモリ上でのみ処理し、サーバー送信・永続保存（LocalStorage / Cookie 等）はしない。

## 開発

ビルドの唯一の真実のソースはルートの `Dockerfile`。ローカル・Devcontainer・CI・Pages はすべて
この Dockerfile の target を切り替えて呼び出す。

### Docker（推奨）

```sh
docker compose up dev                  # dev サーバー (http://localhost:5173)
docker compose run --rm check          # svelte-check + TypeScript
docker compose run --rm lint           # Biome
docker compose run --rm coverage       # Vitest + coverage
docker compose down -v                 # コンテナ・network・named volume を削除
```

ビルド成果物だけをホストに取り出す:

```sh
docker buildx build --target build-output --build-arg BASE_PATH="" \
  --output type=local,dest=./build .
```

`.devcontainer/devcontainer.json` を同梱しているので "Reopen in Container" でそのまま入れる。

### ホストで直接動かす（任意）

[Bun](https://bun.com)（バージョンは `Dockerfile` の `BUN_VERSION` に合わせる）が必要。
コマンドは `package.json` の scripts を参照（`bun run dev` / `build` / `test:coverage` / `check` / `lint`）。
