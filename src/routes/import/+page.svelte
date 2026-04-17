<script lang="ts">
	import { base } from "$app/paths";
	import { onMount } from "svelte";
	import { importTranscript } from "$lib/application/import-transcript";
	import { resolveRuleSet } from "$lib/application/resolve-rule-set";
	import { safeGoto } from "$lib/presentation/navigation";
	import { DomainError } from "$lib/domain/errors/domain-error";
	import { ErrorCode } from "$lib/domain/errors/error-code";
	import { isErr } from "$lib/domain/errors/result";
	import { defaultRegistry } from "$lib/domain/rulesets/index";
	import TranscriptDropZone from "$lib/presentation/components/TranscriptDropZone.svelte";
	import { mhtmlParser } from "$lib/infrastructure/parsers/mhtml/mhtml-parser";
	import { yieldToMain } from "$lib/infrastructure/parsers/mhtml/yield";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { logger } from "$lib/presentation/stores/logger.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { skippedStore } from "$lib/presentation/stores/skipped.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";
	import { warningsStore } from "$lib/presentation/stores/warnings.svelte";

	let importing = $state(false);

	onMount(() => {
		if (profileStore.current === null) {
			void safeGoto(`${base}/profile`);
		}
	});

	const handleFile = async (file: File) => {
		errorsStore.clear();
		warningsStore.dismiss("import:unknown-categories");
		skippedStore.clear();
		const profile = profileStore.current;
		if (profile === null) return;
		const resolved = resolveRuleSet(profile, defaultRegistry);
		if (isErr(resolved)) {
			errorsStore.push(resolved.error);
			return;
		}
		importing = true;
		try {
			const source = new Uint8Array(await file.arrayBuffer());
			// 同期パース開始前にフレームを 1 つ譲ることで、「読み込み中…」の
			// 表示が確実に描画される。PDF は pdfjs-dist 側がさらに非同期で走る。
			await yieldToMain();
			const outcome = await importTranscript({
				source,
				parser: mhtmlParser,
				ruleSet: resolved.value,
				profile,
			});
			if (isErr(outcome)) {
				errorsStore.push(outcome.error);
				logger.error("Transcript import failed", outcome.error);
				return;
			}
			transcriptStore.set(outcome.value.record);
			skippedStore.set(outcome.value.skipped);
			const unknownCount = outcome.value.unknownCategoryCount;
			if (unknownCount > 0) {
				warningsStore.set(
					"import:unknown-categories",
					`${unknownCount} 件の科目が区分未判定（unknown）のまま取り込まれました。卒業要件の判定からは除外されます。区分ルール（category-map）の拡張が必要かもしれません。`,
					{ autoDismissMs: 10_000 },
				);
			}
			logger.info("Transcript imported", {
				courses: outcome.value.record.courses.length,
				skipped: outcome.value.skipped.length,
				unknownCategories: unknownCount,
			});
			void safeGoto(`${base}/dashboard`);
		} catch (cause) {
			const error = new DomainError({
				code: ErrorCode.ImportFileReadFailed,
				message: `Failed to read or import the dropped file '${file.name}'`,
				userMessage:
					"ファイルの読み込みまたは取り込みに失敗しました。別の MHTML を試すか、ブラウザを再起動してみてください。",
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

<h2 class="text-xl font-bold text-[color:var(--color-fg)]">
	成績ファイルをインポート
</h2>
<p class="text-sm text-[color:var(--color-fg-muted)]">
	高知大学「成績閲覧」画面の保存（MHTML）を取り込みます。
	ファイルはブラウザ内だけで処理され、外部には送信されません。
</p>

<TranscriptDropZone onFile={handleFile} disabled={importing} />

{#if importing}
	<p
		class="text-sm text-[color:var(--color-fg-muted)]"
		aria-live="polite"
	>
		読み込み中…
	</p>
{/if}
{#if skippedStore.count > 0}
	<details
		class="rounded-[var(--radius-card)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-4"
	>
		<summary
			class="cursor-pointer text-sm font-medium text-[color:var(--color-warning-fg)]"
		>
			{skippedStore.count} 件の科目を解析できずスキップしました（クリックで詳細）
		</summary>
		<div class="mt-3 overflow-x-auto">
			<table class="min-w-full text-xs">
				<thead class="text-left">
					<tr
						class="border-b border-[color:var(--color-warning-border)] text-[color:var(--color-warning-fg)]"
					>
						<th class="py-1 pr-3">科目名</th>
						<th class="py-1 pr-3">区分ラベル</th>
						<th class="py-1">理由</th>
					</tr>
				</thead>
				<tbody class="text-[color:var(--color-warning-fg)]">
					{#each skippedStore.items as failure, i (`${failure.raw.name}-${i}`)}
						<tr
							class="border-b border-[color:var(--color-warning-border)]/50 last:border-0"
						>
							<td class="py-1 pr-3">{failure.raw.name || "（不明）"}</td>
							<td class="py-1 pr-3">{failure.raw.rawCategoryLabel}</td>
							<td class="py-1">{failure.error.userMessage}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
{/if}
