# Design System — 卒業要件判定ツール

Apple の Web デザインを参照点にした、控えめで読みやすいユーティリティ UI のガイド。
成績データを扱うので、派手さより「数字が見やすい」「状態がひと目でわかる」を優先する。

トークンの値の真実は CSS の `@theme`（`src/routes/layout.css`）。ここには役割と設計理由だけを書く。

## 方針

- 色は極力使わない。アクセントは 1 色（Apple Blue）のみ、インタラクティブ要素専用。
- Web フォントを読み込まず、OS の system UI font で配信する。
- ライト / ダークは `prefers-color-scheme` に追随し、同名トークンの値だけを差し替える。
- 影は最小限。境界より背景色差で区切る。

## フォント

```css
font-family:
  system-ui, -apple-system, BlinkMacSystemFont,
  "Segoe UI Variable", "Segoe UI",
  "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP",
  "Yu Gothic", "Meiryo", sans-serif;
```

等幅は `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`。

### タイポグラフィスケール

Display 40 / H1 28 / H2 22 / H3 17 / Body 15 / Small 13 / Caption 12 / Micro 11（px）。

- 見出しほど line-height を締め（1.08〜1.24）、本文は広く（1.45〜1.55）。
- weight は 400 と 600 が中心。700 以上と 300 は使わない。
- 本文にも軽い負のトラッキング（`-0.005em`）を入れる。

## カラー

- ページは `--color-background`、カードは `--color-surface` の 2 層で構造化する。
- テキスト色は `fg` / `fg-muted` / `fg-subtle` の 3 段に限定し、中間値を増やさない。
- 境界・divider・hover 面・skeleton は純黒 rgba ではなく、スレートインク 1 系統の
  semantic opacity（`--color-overlay-*`）から取る。near-white の地でも濁らない。
- アクセント（`--color-accent`）は CTA・フォーカスリング・リンクだけに使う。
  バッジ・装飾・強調文字には使わない。色は情報ではなく操作の手がかり。
- 状態色は success / warning / danger の 3 系。穏やかな色味にする。

### ダークモード

`prefers-color-scheme: dark` で同名トークンの値だけを差し替える（`-dark` サフィックスは作らない）。
コンポーネントは全て `var(--color-*)` を参照するので値の差し替えだけで反転する。

- テキスト色は不透明なソリッド値で持つ（不透明度インクは暗い地で潰れる）。
- アクセント青はダーク地で沈まないよう明るめにし、塗り上の文字色は暗色へ反転する。
- 全テキスト/アクセント/セマンティック対の AA (4.5:1) と全トークンのダーク値の存在は
  `src/lib/design-tokens.test.ts` が light/dark 両方で機械検証する。

## 余白・サイズ

- スペーススケールは 8px 基本: `2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80 / 120`。
  大きい値（56 以上）はページヒーローの上下など限られた場面で。
- radius は 4 段（chip 4 / control 8 / card 12 / pill 9999、px）。役割につき 1 値、
  中間ステップを増やさない。生の `rounded-*` は使わず `rounded-[var(--radius-*)]`。
- 影は `--shadow-card`（うっすら）と `--shadow-lifted`（浮遊演出）の 2 種のみ。
  ほとんどのカードは影なし + `--color-border` で足りる。影は最前面のサイン専用。
- コンテンツ最大幅 980px。セクション間・ページ上下は 32〜56px、カード間は 16〜24px。

## モーション

1 系統 3 レジスタ。生の `cubic-bezier` / `@keyframes` は書かず、`@theme` のトークン
（`--ease-*` / `--animate-*`）経由でのみ使う。

- state（hover / focus / press）: `--ease-standard`、`motion-safe:transition-*`。
- movement / enter: `--ease-spring`。入場は `animate-rise-in`、`animate-fade-in`、`animate-spinner`。
- `prefers-reduced-motion: reduce` で `layout.css` が全アニメの duration を 0.01ms 化。
  加えて `motion-safe:` を付けて二重に尊重する。

## アイコン

Iconify の Material Icons Round（`ic` セット）を `unplugin-icons` でビルド時インライン展開する
（オフライン・tree-shake・ランタイム fetch ゼロ）。

```svelte
import School from "~icons/ic/round-school";
<School class="h-5 w-5 text-[color:var(--color-accent)]" aria-hidden="true" />
```

- fill ベースなので `currentColor` が効く。色は `text-[color:var(--color-*)]` で指定。
- サイズは `h-4 w-4`（本文脇）/ `h-5 w-5`（ヘッダー・chevron）を基本に。
- 装飾アイコンは `aria-hidden="true"`。

## コンポーネント

具体的な padding・border・radius 値は各コンポーネントの実装が真実。ここでは役割を示す。

- **Button**: 主 = accent 塗り + 白文字、secondary = 境界のみ、pill = リンク寄り、ghost = 無地。
  focus-visible は `outline: 2px solid --color-accent`（offset 2px）。
- **Card**: `--color-surface` + `--color-border` + `--radius-card`。影より境界で区切る。
- **Badge**: success / warning / danger / neutral / accent の 5 種。`accent` は情報ラベル用に控えめ。
  `dot` で先頭に状態ドット。
- **Alert**: 左に色付き縦ボーダー + 薄い色背景 + アイコン。dismiss は ghost button。
- **Progress**: 細いバー。fill は accent（充足時 success）。履修中層は薄い斜線ストライプを重ねる。
  `size="hero"` は太バー、`size="sm"`（既定）は行内・レポート行用。
- **StatMeter**（ヒーロー）: 見出し + `Progress size="hero"` + 数値リードアウト + 補助スロット。
  カードで囲わず余白と階層で前に出す。
- **RequirementRow**: 罫線区切りリストの 1 行（`<a>`）。状態ドット・要件名・現在値・chevron +
  2 行目に slim progress とヒント。均一カードグリッドの代わりに使う。
- **Disclosure**: native `<details>/<summary>` に薄く化粧しただけ。展開・キーボード・SR は
  ブラウザ標準に委ねる。主要情報の下に上級の詳細を畳む。
- **ナビゲーション**: ライトガラス（半透明白 + `backdrop-filter: blur`）、sticky top。
- **入力フォーム**: `--color-border` + `--radius-control`、font 16px（iOS auto-zoom 回避）。
  focus で accent 境界 + 薄いリング。`aria-invalid` で danger 境界。

## do / don't

**do**: アクセント青はインタラクティブ要素だけ / カードは境界で区切る / 見出しは行間詰め・本文は広め /
sticky + blur のガラス風ヘッダー / radius は規定 4 段から選ぶ / `motion-safe:` で reduced-motion 尊重。

**don't**: アクセントを複数色にしない / グラデーション・模様・影の重ね掛けを使わない /
weight 700 以上を使わない / 本文を中央寄せ・14px 未満にしない / セクションごとに罫線を引かない。

## ページのパターン

- **`/import`**: Display 見出し + 1 文の説明。ドロップゾーンを主サーフェスとして単独配置し、
  空 / ドラッグ中 / 取り込み中を 1 面で表現。下に 3 ステップ導線と privacy 注記を caption で。
- **`/dashboard`**: `StatMeter` のヒーロー（verdict + 3 層メーター + 総単位 + メタ）。要件は
  カードグリッドにせず `RequirementRow` の罫線区切りリストに並べる。
- **`/requirements/[id]`**: 戻るリンク + `StatMeter` ヒーロー。主要（内訳・貢献科目・履修中）は
  常時表示、上級の配分情報は `Disclosure`「配分の詳細」に畳む。

## アクセシビリティ

- フォーカスリングは `2px solid --color-accent`（offset 2px）で常時見える。
- `aria-live="polite"` を非同期ステータスに、`aria-invalid` / `aria-describedby` をフォームエラーに。
- `prefers-reduced-motion: reduce` を尊重。タップターゲットは 44px を下限に。
- コントラスト比は `design-tokens.test.ts` が light/dark 両方で検証し、E2E axe が実要素で再確認する。

## パフォーマンス

完全な静的プリレンダリング（SSG, adapter-static）。アプリ CSS は `inlineStyleThreshold` で
`<head>` にインライン化しレンダーブロッキングを排除、`precompress` で .br/.gz を出力。
Web フォント無読み込み、アイコンはビルド時インライン SVG、WASM は Web Worker + 動的 import で
メインスレッド非ブロック。`<html lang="ja">`・ページ毎の `<title>`・meta description を持つ。
