<script lang="ts">
	import Button from "../ui/Button.svelte";
	import FileUp from "~icons/ic/round-upload-file";
	import Spinner from "~icons/ic/round-autorenew";

	interface Props {
		readonly onFile: (file: File) => void;
		readonly accept?: string;
		readonly disabled?: boolean;
		/** 取り込み処理中。ゾーン内にスピナー状態を出し、操作を止める。 */
		readonly busy?: boolean;
		/** 追加クラス（例: flex-1 で親の高さいっぱいに広げる）。 */
		readonly class?: string;
	}

	const {
		onFile,
		accept = ".pdf,application/pdf",
		disabled = false,
		busy = false,
		class: className = "",
	}: Props = $props();

	let dragging = $state(false);
	let inputElement: HTMLInputElement | null = $state(null);

	const inert = $derived(disabled || busy);

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		dragging = false;
		if (inert) return;
		const file = event.dataTransfer?.files[0];
		if (file) onFile(file);
	};

	const handleSelect = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (file && !inert) onFile(file);
		target.value = "";
	};

	const stateClass = $derived.by(() => {
		if (inert) {
			return "border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)]";
		}
		if (dragging) {
			return "border-[color:var(--color-accent)] bg-[color:var(--color-accent-ring)]";
		}
		return "border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-fg-subtle)] hover:bg-[color:var(--color-surface-alt)]";
	});
</script>

<div
	class="flex flex-col items-center justify-center gap-5 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-12 text-center motion-safe:transition-colors sm:py-16 {stateClass} {className}"
	role="region"
	aria-label="成績ファイルのドロップゾーン"
	aria-busy={busy}
	ondragover={(e) => {
		e.preventDefault();
		if (!inert) dragging = true;
	}}
	ondragleave={() => {
		dragging = false;
	}}
	ondrop={handleDrop}
>
	{#if busy}
		<div
			class="flex flex-col items-center gap-3 text-[color:var(--color-fg-muted)]"
			role="status"
			aria-live="polite"
		>
			<Spinner
				class="h-8 w-8 text-[color:var(--color-accent)] motion-safe:animate-spinner"
				aria-hidden="true"
			/>
			<p class="text-body">取り込み中…</p>
		</div>
	{:else}
		<span
			class="flex h-16 w-16 items-center justify-center rounded-[var(--radius-pill)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-fg-subtle)]"
		>
			<FileUp class="h-8 w-8" aria-hidden="true" />
		</span>
		<div class="space-y-1.5">
			<p class="text-h2 text-[color:var(--color-fg)]">
				PDF 成績表をここにドロップ
			</p>
			<p class="text-body text-[color:var(--color-fg-muted)]">
				大学発行の「個別成績表（PDF）」をそのまま
			</p>
		</div>
		<Button
			variant="primary"
			onclick={() => inputElement?.click()}
			disabled={inert}
		>
			ファイルを選択
		</Button>
		<input
			bind:this={inputElement}
			type="file"
			class="hidden"
			{accept}
			disabled={inert}
			onchange={handleSelect}
		/>
	{/if}
</div>
