<script lang="ts">
	import FileUp from "lucide-svelte/icons/file-up";
	import Button from "../ui/Button.svelte";

	interface Props {
		readonly onFile: (file: File) => void;
		readonly accept?: string;
		readonly disabled?: boolean;
	}

	const {
		onFile,
		accept = ".mhtml,.mht,text/html",
		disabled = false,
	}: Props = $props();

	let dragging = $state(false);
	let inputElement: HTMLInputElement | null = $state(null);

	const handleDrop = (event: DragEvent) => {
		event.preventDefault();
		dragging = false;
		if (disabled) return;
		const file = event.dataTransfer?.files[0];
		if (file) onFile(file);
	};

	const handleSelect = (event: Event) => {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (file && !disabled) onFile(file);
		target.value = "";
	};

	const containerClass = $derived.by(() => {
		if (disabled) {
			return "cursor-not-allowed border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] opacity-60";
		}
		if (dragging) {
			return "border-[color:var(--color-accent)] bg-[color:var(--color-surface-muted)]";
		}
		return "border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)]";
	});
</script>

<div
	class="rounded-[var(--radius-card)] border-2 border-dashed p-10 text-center motion-safe:transition-colors {containerClass}"
	ondragover={(e) => {
		e.preventDefault();
		if (!disabled) dragging = true;
	}}
	ondragleave={() => {
		dragging = false;
	}}
	ondrop={handleDrop}
	role="region"
	aria-label="成績ファイルのドロップゾーン"
>
	<FileUp
		class="mx-auto h-10 w-10 text-[color:var(--color-fg-subtle)]"
		aria-hidden="true"
	/>
	<p class="mt-3 text-sm text-[color:var(--color-fg)]">
		成績閲覧画面を保存した MHTML ファイルをここにドロップ
	</p>
	<p class="mt-1 text-xs text-[color:var(--color-fg-subtle)]">または</p>
	<div class="mt-3">
		<Button
			variant="primary"
			size="md"
			onclick={() => inputElement?.click()}
			{disabled}
		>
			ファイルを選択
		</Button>
	</div>
	<input
		bind:this={inputElement}
		type="file"
		class="hidden"
		{accept}
		{disabled}
		onchange={handleSelect}
	/>
</div>
