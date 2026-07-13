<script lang="ts">
	import { base } from "$app/paths";
	import { safeGoto } from "$lib/presentation/navigation";
	import { DomainError } from "$lib/domain/errors/domain-error";
	import { ErrorCode } from "$lib/domain/errors/error-code";
	import TranscriptDropZone from "$lib/presentation/components/TranscriptDropZone.svelte";
	import { yieldToMain } from "$lib/infrastructure/async/yield";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { logger } from "$lib/presentation/stores/logger.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";
	import { warningsStore } from "$lib/presentation/stores/warnings.svelte";
	import { assessmentStore } from "$lib/presentation/stores/assessment.svelte";

	const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // "%PDF"

	const isPdfBytes = (name: string, bytes: Uint8Array): boolean =>
		name.toLowerCase().endsWith(".pdf") ||
		PDF_MAGIC.every((b, i) => bytes[i] === b);

	const notifyUnknown = (count: number) => {
		if (count > 0) {
			warningsStore.set(
				"import:unknown-categories",
				`${count} 件の科目が区分未判定（unknown）のまま取り込まれました。卒業要件の判定からは除外されます。`,
				{ autoDismissMs: 10_000 },
			);
		}
	};

	let importing = $state(false);

	// Official PDF path: runs the Rust/WASM core end-to-end in the browser. The
	// profile is read from the PDF header, so this works without a prior profile
	// step.
	const importFromPdf = async (source: Uint8Array) => {
		await yieldToMain();
		// NOTE: must target the facade file explicitly (`/index`), not the
		// directory. wasm-pack drops a `package.json` (`"main":"degree_audit.js"`)
		// into src/lib/wasm/, so a bare `$lib/wasm` import resolves to the raw WASM
		// glue instead of this worker-backed facade — calling its `importPdf` on the
		// main thread before init throws `__wbindgen_malloc of undefined`.
		const { importPdf } = await import("$lib/wasm/index");
		const bundle = await importPdf(source);
		profileStore.set(bundle.profile);
		transcriptStore.set(bundle.record);
		assessmentStore.set(bundle.assessment);
		notifyUnknown(bundle.unknownCategoryCount);
		if (bundle.skipped > 0) {
			warningsStore.set(
				"import:skipped",
				`${bundle.skipped} 行を取り込めませんでした（PDF の一部行の解釈に失敗）。`,
				{ autoDismissMs: 10_000 },
			);
		}
		logger.info("Transcript imported from PDF (WASM)", {
			courses: bundle.record.courses.length,
			skipped: bundle.skipped,
			unknownCategories: bundle.unknownCategoryCount,
		});
		void safeGoto(`${base}/dashboard`);
	};

	const handleFile = async (file: File) => {
		errorsStore.clear();
		warningsStore.dismiss("import:unknown-categories");
		warningsStore.dismiss("import:skipped");
		assessmentStore.clear();
		importing = true;
		try {
			const source = new Uint8Array(await file.arrayBuffer());

			if (!isPdfBytes(file.name, source)) {
				errorsStore.push(
					new DomainError({
						code: ErrorCode.UnsupportedFileFormat,
						message: `Dropped file '${file.name}' is not a PDF transcript`,
						userMessage:
							"PDF 成績表として認識できませんでした。大学が発行する「個別成績表（PDF）」をドロップしてください。",
						context: { fileName: file.name, fileSize: file.size },
					}),
				);
				return;
			}

			await importFromPdf(source);
		} catch (cause) {
			const error = new DomainError({
				code: ErrorCode.ImportFileReadFailed,
				message: `Failed to read or import the dropped file '${file.name}'`,
				userMessage:
					"ファイルの読み込みまたは取り込みに失敗しました。別の PDF を試すか、ブラウザを再起動してみてください。",
				context: { fileName: file.name, fileSize: file.size },
				cause,
			});
			errorsStore.push(error);
			logger.error("File read failed", error);
		} finally {
			importing = false;
		}
	};
</script>

<svelte:head>
	<title>成績を取り込む — 卒業要件判定ツール</title>
</svelte:head>

<!-- ドロップゾーン自身が用途を説明するので、見出しは文書アウトライン用に
     sr-only で置くだけ。画面上は入力に集中させる。ドロップゾーンはビューポート
     いっぱいに広げ、コンテンツを上下左右中央に置く。 -->
<h2 class="sr-only">成績の取り込み</h2>

<div class="flex min-h-fill flex-col">
	<TranscriptDropZone onFile={handleFile} busy={importing} class="flex-1" />
</div>
