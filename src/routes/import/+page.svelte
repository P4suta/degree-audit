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
	import Card from "$lib/presentation/ui/Card.svelte";

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
	// profile is read from the PDF header, so this works without a prior /profile
	// step.
	const importFromPdf = async (source: Uint8Array) => {
		await yieldToMain();
		const { importPdf } = await import("$lib/wasm");
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

<header class="space-y-3">
	<h2 class="text-display text-[color:var(--color-fg)]">
		成績を取り込む
	</h2>
	<p class="text-body text-[color:var(--color-fg-muted)] max-w-readable">
		大学が発行する <strong class="font-semibold text-[color:var(--color-fg)]"
			>PDF 成績表をドロップ</strong
		>するだけで取り込めます。学部・コース・入学年度は PDF
		から自動で読み取ります。データはブラウザ内のメモリだけで処理され、外部には送信されません。
	</p>
</header>

<Card padding="lg">
	<section aria-labelledby="pdf-heading" class="space-y-4">
		<div class="space-y-2">
			<h3 id="pdf-heading" class="text-h2 text-[color:var(--color-fg)]">
				公式の PDF 成績表をドロップ
			</h3>
			<p class="text-small text-[color:var(--color-fg-muted)]">
				大学が発行する「個別成績表（PDF）」をそのままドロップするだけ。学部・コース・入学年度は
				PDF から自動で読み取ります。判定は Rust / WebAssembly
				エンジンがブラウザ内で実行し、データは外部に送信されません。
			</p>
		</div>
		<TranscriptDropZone onFile={handleFile} disabled={importing} />
	</section>
</Card>

{#if importing}
	<p class="text-small text-[color:var(--color-fg-muted)]" aria-live="polite">
		読み込み中…
	</p>
{/if}
