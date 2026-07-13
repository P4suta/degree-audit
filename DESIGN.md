# Design System — 卒業要件判定ツール

Apple の Web デザインを参照点にした、**控えめで読みやすい** ユーティリティ UI を作るためのガイド。
成績データという重たい情報を扱うアプリなので、派手さよりも「数字が見やすい」「状態がひと目でわかる」ことを優先する。

---

## 0. 方針のひとこと要約

- **控えめでクリーン**。色は極力使わない。アクセントは 1 色（Apple Blue）のみ
- **システムフォント**で配信する。Web フォント読み込みはしない
- **ライト / ダーク両対応**。`prefers-color-scheme` に追随し、同名トークンの値だけを差し替える（詳細は §2）
- **実データの可読性が最優先**。余白、タイポグラフィの階層、要素の密度でヒエラルキーを作る
- **影は最小限**。境界で区切るより背景色差で区切る

---

## 1. フォント

Web フォントを読み込まず、OS の system UI font を使う。日本語フォントは OS 標準のものが入る。

```css
font-family:
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI Variable",
  "Segoe UI",
  "Hiragino Sans",
  "Hiragino Kaku Gothic ProN",
  "Noto Sans JP",
  "Yu Gothic",
  "Meiryo",
  sans-serif;
```

macOS / iOS では SF Pro、Windows では Segoe UI Variable、Android では Roboto が自然に使われる。日本語は OS 標準（macOS のヒラギノ、Windows の游ゴシック等）。

等幅が必要な場面は:

```css
font-family:
  ui-monospace,
  SFMono-Regular,
  "SF Mono",
  Menlo,
  Consolas,
  "Liberation Mono",
  monospace;
```

### タイポグラフィスケール

| Role | Size | Weight | Line-height | Letter-spacing | 用途 |
|---|---|---|---|---|---|
| Display | 40px | 600 | 1.08 | -0.02em | 画面の主見出し（例: 取り込みページ、Dashboard の結果） |
| Heading 1 | 28px | 600 | 1.12 | -0.02em | セクション見出し |
| Heading 2 | 22px | 600 | 1.18 | -0.015em | カード内のメイン見出し |
| Heading 3 | 17px | 600 | 1.24 | -0.01em | カード内の小見出し |
| Body | 15px | 400 | 1.55 | -0.005em | 本文 |
| Body Emphasis | 15px | 600 | 1.4 | -0.005em | 強調した本文 |
| Small | 13px | 400 | 1.45 | 0 | 補足・注釈 |
| Caption | 12px | 400 | 1.4 | 0 | 凡例・ラベル |
| Micro | 11px | 400 | 1.35 | 0 | 法的注記レベル |

**原則**:

- 本文にも負のトラッキング（`-0.005em`）を軽く入れる。Apple は小さいサイズでもタイト
- 見出しほど line-height を締める（1.08 〜 1.24）、本文は広く（1.45 〜 1.55）
- 太さは 400 と 600 が中心。700 は使わない（Apple も bold は稀）
- 装飾的な 300 は使わない（可読性優先のため）

## 2. カラー

### 基調色（ライトテーマ）

```
--color-background: #f5f5f7   /* ページ背景。白すぎない薄いグレー */
--color-surface:    #ffffff   /* カード背景 */
--color-surface-alt:#fbfbfd   /* 微かに差別化したいとき（codeブロックなど） */

--color-fg:         #1d1d1f   /* 第 1 テキスト（不透明インク） */
--color-fg-muted:   #616163   /* 第 2 テキスト */
--color-fg-subtle:  #68686d   /* 第 3 テキスト・placeholder */
```

### overlays（スレートインクの semantic opacity）

境界・区切り・hover 面・skeleton は**純黒 rgba を使わず**、わずかに冷たいスレート
インク（`rgb(29 31 39 / α)`、ダークは `rgb(233 236 244 / α)`）の semantic opacity
1 系統から取る。near-white の地に載せても濁らず「柔らかい構造」として読める。

```
--color-overlay-subtle:  α .04   /* skeleton・最薄 hover */
--color-overlay-muted:   α .06   /* divider */
--color-overlay-light:   α .09   /* border（標準） */
--color-overlay-medium:  α .12   /* hover 面 */
--color-overlay-strong:  α .16   /* border-strong */
--color-overlay-backdrop:        /* modal 背面の dim */

/* border / divider は overlay の役割別名。ダークでも同じ参照で反転する */
--color-border:        var(--color-overlay-light)
--color-border-strong: var(--color-overlay-strong)
--color-divider:       var(--color-overlay-muted)
```

### アクセント（Apple Blue 単色）

```
--color-accent:         #0071e3   /* 主 CTA、フォーカスリング */
--color-accent-hover:   #0077ed   /* hover 時 */
--color-accent-link:    #0066cc   /* 本文中のテキストリンク */
--color-accent-fg:      #ffffff   /* accent の上に載せる文字 */
```

**ルール**: Apple Blue は **インタラクティブ要素** のためだけに使う。
バッジ、装飾、強調文字など「触れない要素」には使わない。色は情報ではなく操作の手がかり。

### セマンティック（状態色）

ライトで穏やかな色味。派手にはしない。

```
/* 成功 */
--color-success-bg:     #e6f4ea
--color-success-fg:     #1b6b3a
--color-success-border: #b7e0c6

/* 警告（枠超過・注意喚起） */
--color-warning-bg:     #fff7e0
--color-warning-fg:     #8a5a00
--color-warning-border: #f4d988

/* エラー */
--color-danger-bg:      #fde8e8
--color-danger-fg:      #a1001a
--color-danger-border:  #f4b8b8
```

### 配色のルール

- ページは `--color-background`（#f5f5f7）、カードは `--color-surface`（白）。この 2 層で構造化する
- セクション区切りに罫線を引くより、背景の濃淡で区切ることを優先する
- テキストの色は 3 段階（`fg` / `fg-muted` / `fg-subtle`）に限定し、他の中間値を増やさない
- リンクは `--color-accent-link`（Apple Blue より少し暗い）+ underline（hover 時）。装飾はしない

### ダークモード

`prefers-color-scheme: dark` で、**同名トークンの値だけ**を差し替える（`-dark` サフィックスは作らない）。コンポーネントは全て `var(--color-*)` を参照するので、値の差し替えだけで UI 全体が反転する。

- テキスト色は不透明なソリッド値で持つ（`rgba` の不透明度インクは暗い地で潰れるため、`--color-fg-muted` 等はソリッド化済み）
- アクセント青はダーク地で沈まないよう明るめ（`#3d9bff`）にし、塗りに載る文字 `--color-accent-fg` は暗色へ反転する
- `--color-danger` は「白文字ボタンの塗り」用にダークでも十分濃く保ち、パネル文字用の `--color-danger-fg` は別に明るくする
- 全テキスト/アクセント/セマンティック対の AA (4.5:1)、および全色トークンにダーク値がある事は `src/lib/design-tokens.test.ts` が機械検証する
- 初回描画のちらつきは、SSG + システムフォント + CSS 変数のみの構成なので CSS メディアクエリだけで回避でき、JS シードは不要

## 3. 余白・サイズ

### スペーススケール

8px を基本単位とする、ゆるやかなスケール:

```
2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80 / 120
```

- 微調整のために 6px など奇数を許容
- 大きい余白（56 / 80 / 120）はページヒーローの上下など限られた場面で

### radius

要素サイズ基準の **4 段**。役割につき 1 値、値の重複を持たない（中間ステップを増やさない）。

```
--radius-chip:     4px   /* chip / tag / grade pill */
--radius-control:  8px   /* button / input / select */
--radius-card:    12px   /* card / cell / dropzone / modal */
--radius-pill:  9999px   /* pill CTA・status pill・progress track */
```

- 12px を超える角丸は使わない（`--radius-pill` を使う場面以外）
- 生の `rounded` / `rounded-sm/md/lg/[…]` は使わず、必ず `rounded-[var(--radius-*)]`

### 影

影は **極力使わない**。使う場合は以下 2 種のみ。

```
--shadow-card:   0 1px 3px rgba(0, 0, 0, 0.06)
                 /* カードにうっすら載せる程度 */
--shadow-lifted: 0 3px 30px rgba(0, 0, 0, 0.22)
                 /* Apple が product card に使う、離散的に浮いている演出 */
```

ほとんどのカードは **影なし + 境界 `--color-border`** で十分。影は「最前面に上がっている」ことを示すサイン専用。

### レイアウト

- コンテンツ最大幅: **980px**（Apple のコンテナ幅に準拠）
- ページ上下: 32 〜 56px（ヘッダー含む）
- セクション間: 32 〜 56px
- カード間: 16 〜 24px

## 3.5 モーション

1 系統 3 レジスタ。生の `cubic-bezier` / `@keyframes` はコンポーネントに書かず、
`@theme` のトークン（`--ease-*` / `--animate-*`）経由でのみ使う。

- **state**（hover / focus / press）: `motion-safe:transition-colors` /
  `-transform`。イージングは `--ease-standard`（`cubic-bezier(.4,0,.2,1)`）。
- **movement / enter**: `--ease-spring`。セクション入場は `animate-rise-in`
  （opacity + 6px 上げ）、フェードは `animate-fade-in`、スピナーは `animate-spinner`。
- `prefers-reduced-motion: reduce` で全アニメを実質停止（`layout.css` が一括で
  duration を 0.01ms 化）。`motion-safe:` を付けて二重に尊重する。

## 3.6 アイコン

Iconify の **Material Icons Round**（`ic` セット）を `unplugin-icons` で**ビルド時
インライン**する（オフライン・tree-shake・ランタイム fetch ゼロ）。

```svelte
import School from "~icons/ic/round-school";
<School class="h-5 w-5 text-[color:var(--color-accent)]" aria-hidden="true" />
```

- fill ベースなので `currentColor` が効く。色は `text-[color:var(--color-*)]` で。
- サイズは `h-4 w-4`（本文脇）/ `h-5 w-5`（ヘッダー・chevron）を基本に。
- 意味を持たない装飾アイコンは `aria-hidden="true"`。

## 4. コンポーネント

### Button

```
bg: accent            fg: white       radius: 8px     padding: 8px 15px   weight: 400
bg: transparent       fg: fg          radius: 8px     border: 1px solid border   (secondary)
bg: transparent       fg: accent-link radius: 9999px  padding: 4px 14px   (pill, link 寄り)
bg: transparent       fg: fg-muted    border: none                         (ghost)
```

- フォントサイズは 15px（本文と同じ）、小サイズは 13px
- focus-visible では `outline: 2px solid --color-accent; outline-offset: 2px`
- hover はアクセントなら accent-hover、それ以外なら背景を `--color-divider` 程度の薄いグレーに

### Card

```
bg: --color-surface
border: 1px solid --color-border
radius: --radius-card (12px)
padding: 16 〜 32px
shadow: なし or --shadow-card
```

影より境界で区切る。複数カードを並べる画面では影は消して境界だけで OK。

### Badge

```
bg: --color-{semantic}-bg
fg: --color-{semantic}-fg
border: 1px solid --color-{semantic}-border
radius: --radius-chip (4px)  OR  9999px (pill)
font: 12px (caption), weight 500
padding: 2px 8px
```

- 色は success / warning / danger / neutral / accent の 5 種。`accent` バリアントは
  情報ラベル（リンク/ボタンに化けない）用に控えめに扱う
- `dot` 指定で先頭に variant 色の状態ドットを出す。レポート行やヒーローの状態表示に使う

### Alert

左に色付きの縦ボーダー + 薄い色背景 + アイコン + テキスト。

```
bg: --color-{semantic}-bg
border-left: 3px solid --color-{semantic}-fg
padding: 12px 16px
radius: --radius-md
```

右側に dismiss ボタン（`X`）を置く場合は ghost button スタイルで。

### Progress

細い 4px のバー。背景は `--color-divider`、fill は `--color-accent`（満たされていれば `--color-success-fg`）。

```
track: height 4px (sm) / 8px (hero), bg --color-divider, radius 9999px
fill:  bg --color-accent (unsatisfied) / --color-success-fg (satisfied)
       履修中層は accent の薄い斜線ストライプを下敷きに重ねる
       motion-safe で transition
```

`size="hero"` でヒーロー用の太バー（8px）。`size="sm"`（既定）は行内・レポート行用。

### StatMeter（ヒーロー）

大見出し（verdict / 要件名）＋ `Progress size="hero"` ＋ 数値リードアウト
（`X / Y 単位`）＋ 補助スロット（`lead` / `meta`）を 1 かたまりにする。カードで
囲わず、余白と階層で前に出す。Dashboard と要件詳細のヒーローで共用。

### RequirementRow（レポート行）

罫線区切りリストの 1 行（`<a>`）。行頭に状態ドット badge・要件名・右端に現在値と
chevron、2 行目に slim progress と「あと N / 履修中 +N」ヒント。hover は
`--color-overlay-subtle` 面、focus は inset リング。均一カードグリッドの代わりに使う。

### Disclosure（段階開示）

native `<details>/<summary>` に薄く化粧しただけ。展開・キーボード・SR 通知は
ブラウザ標準に委ねる。主要情報の下に「上級の詳細」を畳んで壁を作らないために使う。

### ナビゲーション

```
bg: rgba(255, 255, 255, 0.72)
backdrop-filter: saturate(180%) blur(20px)
border-bottom: 1px solid --color-border
height: 52px
position: sticky top:0
```

Apple のダークガラス（`rgba(0,0,0,0.8)`）ではなく、**ライトガラス**で統一する。
本文と同じ背景色にぼかしを足した控えめな浮遊感。

### 入力フォーム

```
input:
  bg: #ffffff
  border: 1px solid --color-border
  radius: --radius-control (8px)
  padding: 8px 12px
  font: 16px (iOS auto-zoom 回避)

input:focus:
  border-color: --color-accent
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.15)  /* 薄いアクセントリング */
  outline: none

input[aria-invalid="true"]:
  border-color: --color-danger-border
  box-shadow: 0 0 0 3px rgba(161, 0, 26, 0.1)
```

## 5. do / don't

### ✅ do

- アクセント青は **インタラクティブ要素だけ** に使う
- カードは境界で区切る。影は最後の手段
- 本文にも負のトラッキング（`-0.005em` 程度）を入れる
- 見出しは行間詰め（1.08〜1.24）、本文は広め（1.45〜1.55）
- ページ上部に `sticky` + 軽い `backdrop-filter: blur` のガラス風ヘッダー
- radius は 4 / 6 / 8 / 12 / pill のうちから選ぶ。中間値を増やさない
- `motion-safe:` で reduced-motion 尊重

### ❌ don't

- アクセントを複数色にしない（バッジや装飾に青を使うのも ❌）
- グラデーション・模様・影の重ね掛けを使わない
- 太字 700 / 800 / 900 は使わない（weight は 400 と 600 中心）
- 中央寄せ本文はしない（本文は左寄せ）
- 12px を超える rectangle radius（ピル以外）を使わない
- 本文に 14px 未満を使わない（Small 13、Caption 12、Micro 11 は必要な時だけ）
- セクションごとに罫線を引かない（背景色差で区切る）

## 6. 各ページのパターン

### `/import` 成績取り込み

- **Display** 見出し「成績を取り込む」＋ 1 文の説明（重複させない）
- ドロップゾーンを**主サーフェス**として単独配置（Card で二重に囲わない）。空状態・
  ドラッグ中・取り込み中（スピナー + `aria-busy`）を 1 つの面で表現
- 下に 3 ステップの安心導線（PDF → 判定 → 結果）と privacy 注記を caption で

### `/dashboard`（レポート型）

- **ヒーロー**: `StatMeter` で verdict 見出し（Display）＋太い全体メーター（完了/
  履修中/残の 3 層）＋`総 X / 124` ＋メタ（不足要件 N 件・卒論資格 badge・履修中）
- **要件**: 均一カードグリッドにしない。`RequirementRow` を**罫線区切りの整列リスト**
  に並べる（行頭ドット・要件名・slim progress・`actual/required`・chevron）。
  `総修得単位`・`卒論資格` は末尾に「全体」小見出しで区別

### `/requirements/[id]`（段階開示）

- 戻るリンク（arrow-back アイコン + accent-link）
- **ヒーロー**: `StatMeter`（要件名 Display + 状態 badge + 大メーター + 現在値）。
  診断は disc 箇条書きにせず静かな注記に
- 主要（内訳・貢献科目・履修中）は常時表示。**上級の配分情報（読み替え・算入外・
  要件超過）は `Disclosure`「配分の詳細」に畳む**（壁を作らない）

## 7. アクセシビリティ

- フォーカスリングは `2px solid --color-accent` + `outline-offset: 2px` で常時見える
- `aria-live="polite"` を非同期ステータス（読み込み中、警告）に
- `aria-invalid`, `aria-describedby` をフォームエラーに
- `prefers-reduced-motion: reduce` を尊重（全アニメーション実質停止）
- タップターゲットは `min-h-tap`（44px）を下限に
- コントラスト比：全テキスト/アクセント/セマンティック対の AA (4.5:1) を
  `design-tokens.test.ts` が light/dark 両方で機械検証し、E2E axe が実要素で再確認

## 7.5 パフォーマンス / Lighthouse

「合理的な範囲で」4 カテゴリを高く保つ。派手さのための重い仕掛けは足さない。
実測（`/import`, Edge headless）: **モバイル 99 / デスクトップ 100**、A11y・
Best Practices・SEO は各 100（LCP 0.4〜1.7s・TBT 0ms・CLS 0）。

- **Performance**: 完全な静的プリレンダリング（SSG, adapter-static）。**アプリ CSS
  (~41KB) を `inlineStyleThreshold` で `<head>` にインライン化**し、レンダー
  ブロッキングな `<link rel=stylesheet>` の往復を排除（残る link は
  `disabled media="(max-width:0)"` の非ブロッキング参照）。`precompress` で .br/.gz も
  出力。Web フォント無読み込み（システムフォント）。アイコンはビルド時インライン
  SVG（fetch ゼロ）。WASM は Web Worker + 動的 import で初期バンドル外・メイン
  スレッド非ブロック。画像なし。
  - 唯一の diagnostic は同意ダイアログ `showModal()` の forced reflow（CJK 整形の
    同期レイアウト、二重 rAF で遅延済み・スコア対象メトリクスには非影響）。
- **SEO**: `<html lang="ja">`・ページ毎の `<title>`・`app.html` に meta description。
  リンクはクロール可能な `<a href>`。
- **Best Practices**: `theme-color` を light/dark 双方に。`viewport-fit=cover` で
  safe-area 対応。コンソールエラー/非推奨 API を出さない。外部リソース依存なし。
- **Accessibility**: §7 の通り（axe を CI で light/dark 両テーマ緑にゲート）。

## 8. 将来の拡張

以下は v1 ではやらない:

- アイコンフォント・Web フォント（lucide-svelte の個別 import で必要分のみ）
- モーションが派手な演出（`prefers-reduced-motion` 尊重のため控えめ固定）

以上を既定として全 UI を組む。既存コンポーネントもこのガイドに合わせて書き換える。
