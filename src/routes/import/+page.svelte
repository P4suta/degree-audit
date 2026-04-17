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
	import { workerBackedAutoParser } from "$lib/infrastructure/workers/transcript-worker-client";
	import { yieldToMain } from "$lib/infrastructure/parsers/mhtml/yield";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { logger } from "$lib/presentation/stores/logger.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { skippedStore } from "$lib/presentation/stores/skipped.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";
	import { warningsStore } from "$lib/presentation/stores/warnings.svelte";
	import Button from "$lib/presentation/ui/Button.svelte";
	import Card from "$lib/presentation/ui/Card.svelte";

	let importing = $state(false);
	let pasteText = $state("");

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
				parser: workerBackedAutoParser,
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
					"ファイルの読み込みまたは取り込みに失敗しました。別の PDF / MHTML を試すか、ブラウザを再起動してみてください。",
				context: { fileName: file.name, fileSize: file.size },
				cause,
			});
			errorsStore.push(error);
			logger.error("File read failed", error);
		} finally {
			importing = false;
		}
	};

	const handlePaste = async () => {
		const text = pasteText.trim();
		if (text === "") return;
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
			const source = new TextEncoder().encode(text);
			await yieldToMain();
			const outcome = await importTranscript({
				source,
				parser: workerBackedAutoParser,
				ruleSet: resolved.value,
				profile,
			});
			if (isErr(outcome)) {
				errorsStore.push(outcome.error);
				logger.error("Transcript paste import failed", outcome.error);
				return;
			}
			transcriptStore.set(outcome.value.record);
			skippedStore.set(outcome.value.skipped);
			const unknownCount = outcome.value.unknownCategoryCount;
			if (unknownCount > 0) {
				warningsStore.set(
					"import:unknown-categories",
					`${unknownCount} 件の科目が区分未判定（unknown）のまま取り込まれました。`,
					{ autoDismissMs: 10_000 },
				);
			}
			logger.info("Transcript imported from paste", {
				courses: outcome.value.record.courses.length,
				skipped: outcome.value.skipped.length,
				unknownCategories: unknownCount,
			});
			pasteText = "";
			void safeGoto(`${base}/dashboard`);
		} catch (cause) {
			const error = new DomainError({
				code: ErrorCode.ImportFileReadFailed,
				message: "Failed to parse pasted text",
				userMessage:
					"貼り付けたテキストの取り込みに失敗しました。範囲を変えて再度お試しください。",
				context: { length: text.length },
				cause,
			});
			errorsStore.push(error);
			logger.error("Paste import failed", error);
		} finally {
			importing = false;
		}
	};
</script>

<h2 class="text-xl font-bold text-[color:var(--color-fg)]">
	成績ファイルをインポート
</h2>
<p class="text-sm text-[color:var(--color-fg-muted)]">
	以下のいずれかの方法で取り込めます。データはブラウザ内のメモリだけで処理され、
	外部には送信されません。
</p>

<TranscriptDropZone onFile={handleFile} disabled={importing} />

<div
	class="flex items-center gap-3 text-xs text-[color:var(--color-fg-subtle)]"
>
	<span class="h-px flex-1 bg-[color:var(--color-border)]"></span>
	<span>または、成績ページからコピペで取り込む</span>
	<span class="h-px flex-1 bg-[color:var(--color-border)]"></span>
</div>

<Card padding="lg">
	<section aria-labelledby="paste-heading" class="space-y-4">
		<div class="space-y-1">
			<h3
				id="paste-heading"
				class="text-base font-semibold text-[color:var(--color-fg)]"
			>
				📋 成績ページからコピペで取り込む
			</h3>
			<p class="text-sm text-[color:var(--color-fg-muted)]">
				高知大学「Web 成績 / 成績閲覧」ページを開いて、以下の手順でコピーしてください。
			</p>
		</div>

		<ol
			class="list-inside list-decimal space-y-1 text-sm text-[color:var(--color-fg)]"
		>
			<li>
				成績テーブルの <strong>先頭行「共通教育」</strong> から
				<strong>末尾行「修得単位計」</strong> までをマウスで選択
			</li>
			<li>コピー（<kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>⌘</kbd>+<kbd>C</kbd>）</li>
			<li>下のテキストエリアに貼り付け → 「取り込み」</li>
		</ol>

		<p class="text-xs text-[color:var(--color-fg-subtle)]">
			※ ページ全体を <kbd>Ctrl</kbd>+<kbd>A</kbd> → コピーでも OK です。前後の
			不要な情報（タブ名・学生情報・GPA 欄など）は自動で無視されます。<br />
			※ 一部のセクション（例：教養科目 から 次のセクションまで）だけを貼り付けて、
			部分的に確認することもできます。
		</p>

		<pre
			class="overflow-x-auto rounded-[var(--radius-control)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-3 text-xs leading-relaxed text-[color:var(--color-fg-muted)]"><code
				>┌ Web 成績ページ（イメージ）
│ これまでの成績
│
│ ━━━━ ここから選択 ━━━━━━━━━━━━━━━━━━━━━
│ 共通教育
│   初年次科目
│     大学基礎論 … 2 … 86 … 優 … 2022 …
│   教養科目
│     ...
│ 専門科目
│   ...
│ 修得単位計    138
│ ━━━━ ここまで選択 ━━━━━━━━━━━━━━━━━━━━━
│
│ 科目区分別修得状況 ...（ここから下は無視される）
│ GPA 欄 ...
└</code></pre>

		<label
			for="paste-textarea"
			class="block text-sm font-medium text-[color:var(--color-fg)]"
		>
			貼り付け
		</label>
		<textarea
			id="paste-textarea"
			bind:value={pasteText}
			disabled={importing}
			rows="10"
			placeholder="ここに成績ページからコピーしたテキストを貼り付け"
			class="block w-full rounded-[var(--radius-control)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-raised)] p-3 font-mono text-xs text-[color:var(--color-fg)] shadow-sm focus:border-[color:var(--color-accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
		></textarea>

		<div class="flex items-center gap-2">
			<Button
				onclick={handlePaste}
				disabled={importing || pasteText.trim() === ""}
				variant="primary"
			>
				取り込み
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => {
					pasteText = "";
				}}
				disabled={importing || pasteText === ""}
			>
				クリア
			</Button>
		</div>
	</section>
</Card>

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
