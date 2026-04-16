<script lang="ts">
	import { FileUp } from "lucide-svelte";

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
</script>

<div
	class={`rounded-lg border-2 border-dashed p-10 text-center transition
		${
			disabled
				? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"
				: dragging
					? "border-sky-500 bg-sky-50"
					: "border-slate-300 bg-slate-50"
		}`}
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
	aria-disabled={disabled}
>
	<FileUp class="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
	<p class="mt-3 text-sm text-slate-700">
		成績閲覧画面を保存した MHTML ファイルをここにドロップ
	</p>
	<p class="mt-1 text-xs text-slate-500">または</p>
	<button
		type="button"
		class="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
		onclick={() => inputElement?.click()}
		{disabled}
	>
		ファイルを選択
	</button>
	<input
		bind:this={inputElement}
		type="file"
		class="hidden"
		{accept}
		{disabled}
		onchange={handleSelect}
	/>
</div>
