# 卒業要件判定ツール

[![CI](https://github.com/P4suta/degree-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/P4suta/degree-audit/actions/workflows/ci.yml)
[![Deploy](https://github.com/P4suta/degree-audit/actions/workflows/deploy.yml/badge.svg)](https://github.com/P4suta/degree-audit/actions/workflows/deploy.yml)

公開 URL: <https://p4suta.github.io/degree-audit/>

大学の「Web 成績」からコピー＆ペースト or MHTML 保存した成績データを取り込み、
**卒業要件の充足状況**と**卒業論文履修資格**を可視化する非公式 Web ツール。

ブラウザ内だけで動くクライアントサイド SPA（SvelteKit + adapter-static）で、
サーバーへのアップロード・永続保存は一切ありません。

## 対応範囲

現時点で対応している学生：

- **人文社会科学部 人文科学コース**
  - 令和 2〜5 年度（2020〜2023 年度）入学生
  - 令和 6 年度（2024 年度）以降入学生

令和元年度（2019 年度）以前の入学生、他学部・他コースは現時点では未対応です。

## 免責事項

本ツール「卒業要件判定ツール」（以下「本ツール」）は、個人が作成・提供する
**非公式**のものであり、特定の大学・教育機関とは一切の関係がなく、いかなる
機関による承認又は推奨を受けたものではありません。

大学の規程は改定されることがあり、本ツール作成時点（2026 年 4 月）の内容と
最新の規程が異なる場合があります。

本ツールは現状有姿（AS IS）で提供され、明示又は黙示を問わず、正確性、
完全性、最新性、特定目的への適合性その他一切の保証をいたしません。本ツールの
利用又は利用不能により生じた直接的又は間接的な損害（履修登録の誤り、単位
不足による留年・卒業延期その他の不利益を含みます）について、作成者は一切の
責任を負いません。

**本ツールの判定結果は、履修計画を立てる際の参考情報にすぎません。**
**卒業・履修に関わる最終的な判断は、必ず**

- 所属学部が発行する最新の**履修案内**
- 所属学部の**教務担当**（学生支援課、教務課等）
- **指導教員（チューター）**

**のいずれかによりご確認ください。**
特に卒業論文履修資格については、年 2 回（3 月・9 月）に開催される大学の
卒業論文履修資格判定会議が公式な判定機関となります。

入力された学生プロフィール・成績データは、すべてご利用中のブラウザタブ内の
メモリ上でのみ処理されます。サーバーへの送信、ブラウザへの永続保存
（LocalStorage / Cookie 等）は一切行われません。

## 開発

Bun バージョン・依存解決・型チェック・lint・テスト・ビルドは
ルートの `Dockerfile` が唯一の真実のソースです。
ローカル・Devcontainer・CI・Pages ビルドはすべて、この Dockerfile の
target を切り替えて呼び出す構成になっています。

### Docker で動かす（推奨）

必要なもの: Docker Engine / Docker Desktop / Rancher Desktop のいずれか。

```sh
docker compose up dev                    # dev サーバー (http://localhost:5173)
docker compose run --rm check            # svelte-check + TypeScript
docker compose run --rm lint             # Biome
docker compose run --rm test             # Vitest
docker compose run --rm coverage         # Vitest + coverage
docker compose run --rm preview          # vite preview (http://localhost:4173)
```

ビルド成果物だけをホストに取り出すときは:

```sh
docker buildx build \
  --target build-output \
  --build-arg BASE_PATH="" \
  --output type=local,dest=./build \
  .
```

`node_modules` と `.svelte-kit` は compose 側の named volume に閉じ込めているため、
ホスト側の `node_modules`（別 OS / 別 Bun バージョンでインストールされた残骸）と
衝突しません。

開発が終わったらコンテナと network を片付けます:

```sh
docker compose down        # コンテナと network を削除
docker compose down -v     # さらに named volume も削除（次回起動で bun install が再実行）
```

### Devcontainer

`.devcontainer/devcontainer.json` を同梱しています。
VS Code の "Reopen in Container" や JetBrains Gateway の Dev Containers から
そのまま入れます。

### ホストで直接動かす（任意）

Docker なしで動かすこともできます。必要なもの: [Bun](https://bun.com)
（バージョンは `Dockerfile` の `BUN_VERSION` と一致させてください）。

```sh
bun install
bun run dev            # 開発サーバー
bun run build          # 本番ビルド (build/ に出力)
bun run test:coverage  # テスト + カバレッジ
bun run check          # 型チェック
bun run lint           # Biome
```

プロジェクトのテスト方針は `CLAUDE.md` と `DESIGN.md` を参照してください。
