# tests/fixtures

実データ（実在する学生の PDF 成績表）はコミットせず、環境変数経由でローカルからのみ読み込む
オラクルテストで PDF 解析を検証する:

- `crates/transcript-parse/tests/real_pdf.rs` — `TRANSCRIPT_ORACLE`
- `crates/pdf-glyphs/tests/real_pdf.rs` — `PDF_GLYPHS_ORACLE`

環境変数が未設定ならスキップするので、CI は実データ無しでグリーンになる。
ローカルで手動確認する PDF をこのディレクトリに置く場合は `.gitignore` に追加し、コミットしないこと。
