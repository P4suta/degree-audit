# tests/fixtures

入力は **公式 PDF 成績表** に一本化されています。PDF の解析は Rust 側の
オラクルテストで検証しており、実データ（実在する学生の個別成績表 PDF）は
コミットせず、環境変数経由でローカルからのみ読み込みます:

- `crates/transcript-parse/tests/real_pdf.rs` — `TRANSCRIPT_ORACLE`
- `crates/pdf-glyphs/tests/real_pdf.rs` — `PDF_GLYPHS_ORACLE`

いずれも環境変数が未設定なら自動でスキップされるため、CI では実データ無しでも
グリーンになります。

**ローカルで実データを使う場合**

このディレクトリに個別成績表 PDF を置いて手動確認に使えます。実在する成績情報を
含むファイルは **絶対にコミットしないでください**（当該パスを `.gitignore` に追加し、
本人のローカル環境限りで利用すること）。
