<script lang="ts">
	import { base } from "$app/paths";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { importTranscript } from "$lib/application/import-transcript";
	import { resolveRuleSet } from "$lib/application/resolve-rule-set";
	import { DomainError } from "$lib/domain/errors/domain-error";
	import { ErrorCode } from "$lib/domain/errors/error-code";
	import { isErr } from "$lib/domain/errors/result";
	import { defaultRegistry } from "$lib/domain/rulesets/index";
	import TranscriptDropZone from "$lib/presentation/components/TranscriptDropZone.svelte";
	import { mhtmlParser } from "$lib/infrastructure/parsers/mhtml/mhtml-parser";
	import { errorsStore } from "$lib/presentation/stores/errors.svelte";
	import { logger } from "$lib/presentation/stores/logger.svelte";
	import { profileStore } from "$lib/presentation/stores/profile.svelte";
	import { transcriptStore } from "$lib/presentation/stores/transcript.svelte";

	let importing = $state(false);
	let skippedCount = $state(0);

	onMount(() => {
		if (profileStore.current === null) {
			void goto(`${base}/profile`);
		}
	});

	const handleFile = async (file: File) => {
		errorsStore.clear();
		const profile = profileStore.current;
		if (profile === null) return;
		const resolved = resolveRuleSet(profile, defaultRegistry);
		if (isErr(resolved)) {
			errorsStore.push(resolved.error);
			return;
		}
		importing = true;
		try {
			const source = await file.text();
			const outcome = importTranscript({
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
			skippedCount = outcome.value.skipped.length;
			logger.info("Transcript imported", {
				courses: outcome.value.record.courses.length,
				skipped: skippedCount,
			});
			void goto(`${base}/dashboard`);
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

<h2 class="text-xl font-bold">成績ファイルをインポート</h2>
<p class="text-sm text-slate-600">
	高知大学「成績閲覧」画面の保存（MHTML）を取り込みます。
	ファイルはブラウザ内だけで処理され、外部には送信されません。
</p>

<TranscriptDropZone onFile={handleFile} />

{#if importing}
	<p class="text-sm text-slate-600">読み込み中…</p>
{/if}
{#if skippedCount > 0}
	<p class="text-sm text-amber-700">
		{skippedCount} 件の科目は解析できずスキップされました（詳細は開発者コンソール）。
	</p>
{/if}
