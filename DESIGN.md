# Design System — 卒業要件判定ツール

Apple の Web デザインを参照点にした、**控えめで読みやすい** ユーティリティ UI を作るためのガイド。
成績データという重たい情報を扱うアプリなので、派手さよりも「数字が見やすい」「状態がひと目でわかる」ことを優先する。

---

## 0. 方針のひとこと要約

- **控えめでクリーン**。色は極力使わない。アクセントは 1 色（Apple Blue）のみ
- **システムフォント**で配信する。Web フォント読み込みはしない
- **ライトテーマ固定**。OS の dark mode は当面追随しない（Apple の Web も light 単一）
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

--color-fg:         #1d1d1f                  /* 第 1 テキスト */
--color-fg-muted:   rgba(29, 29, 31, 0.72)   /* 第 2 テキスト */
--color-fg-subtle:  rgba(29, 29, 31, 0.48)   /* 第 3 テキスト・disabled */

--color-border:         rgba(0, 0, 0, 0.08)  /* 極薄境界 */
--color-border-strong:  rgba(0, 0, 0, 0.16)  /* 必要なときだけ */
--color-divider:        rgba(0, 0, 0, 0.06)
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

## 3. 余白・サイズ

### スペーススケール

8px を基本単位とする、ゆるやかなスケール:

```
2 / 4 / 6 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80 / 120
```

- 微調整のために 6px など奇数を許容
- 大きい余白（56 / 80 / 120）はページヒーローの上下など限られた場面で

### radius

```
--radius-micro:  4px   /* チップ / タグ */
--radius-sm:     6px   /* inputs */
--radius-md:     8px   /* ボタン・カード（標準） */
--radius-lg:    12px   /* 大きいカード・モーダル */
--radius-pill: 9999px  /* pill CTA・タブ */
```

- 12px を超える角丸は基本使わない（`--radius-pill` を使う場面以外）
- カードの推奨は `--radius-md`（8px）〜 `--radius-lg`（12px）

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
radius: --radius-md (8px)
padding: 16 〜 24px
shadow: なし or --shadow-card
```

影より境界で区切る。複数カードを並べる画面では影は消して境界だけで OK。

### Badge

```
bg: --color-{semantic}-bg
fg: --color-{semantic}-fg
border: 1px solid --color-{semantic}-border
radius: --radius-micro (4px)  OR  9999px
font: 12px, weight 500
padding: 2px 8px
```

- 色は success / warning / danger / neutral の 4 種のみ。accent（青）はバッジには使わない
  （バッジ = 非インタラクティブ、accent = インタラクティブのルール）

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
track: height 4px, bg --color-divider, radius 9999px
fill:  bg --color-accent (unsatisfied) / --color-success-fg (satisfied)
       motion-safe で transition
label: 上に「あと N 単位」を `--color-fg-muted` で表示
```

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
  radius: --radius-sm (6px)
  padding: 8px 12px
  font: 15px

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

- **Display** 見出し「成績を取り込む」
- 本文（fg-muted）で短い説明
- コピペ Card を primary として配置
- MHTML ドロップゾーンは `<details>` で畳む（開発者向け）

### `/dashboard`

- Summary ブロックを画面上部に大きめに（40px Display + 判定の可否 Badge）
- 要件カードを 2-3 列グリッドに
- 各カードは: Heading 3 / Progress / 「あと N 単位」 / Badge

### `/requirements/[id]`

- 戻るリンク（accent-link）
- 主見出し（Heading 1）
- Progress Card（大きめ、現在値 + 残り）
- Diagnostics、subResults、貢献科目、読み替え、算入外、要件超過 のセクション

### `/profile`

- Heading 1 + 短い説明
- 単一カード内にフォームを配置

## 7. アクセシビリティ

- フォーカスリングは `2px solid --color-accent` + `outline-offset: 2px` で常時見える
- `aria-live="polite"` を非同期ステータス（読み込み中、警告）に
- `aria-invalid`, `aria-describedby` をフォームエラーに
- `prefers-reduced-motion: reduce` を尊重（全アニメーション実質停止）
- コントラスト比：body text の `rgba(29, 29, 31, 0.72)` on `#f5f5f7` で WCAG AA クリア

## 8. 将来の拡張

以下は v1 ではやらない:

- Dark mode（Apple も Web では採用していない。セクション単位の dark は今回対象外）
- アイコンフォント・Web フォント（lucide-svelte の個別 import で必要分のみ）
- モーションが派手な演出（`prefers-reduced-motion` 尊重のため控えめ固定）

以上を既定として全 UI を組む。既存コンポーネントもこのガイドに合わせて書き換える。
