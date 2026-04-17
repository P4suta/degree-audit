<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";

	// DESIGN.md は本文 15px だが、フォーム要素は iOS Safari の
	// 自動ズーム（font-size < 16px でフォーカス時にズームインされる）を
	// 回避するため text-base (16px) を強制する。
	//
	// min-h-[44px] は iOS HIG / Material のタップターゲット推奨下限。
	// value は bind:value で双方向にしたい場面が多いため、Svelte 5 の
	// `bindable` で受ける。

	interface Props extends Omit<HTMLInputAttributes, "class" | "value"> {
		value?: string;
		class?: string;
		invalid?: boolean;
		errorId?: string | undefined;
	}

	let {
		value = $bindable(""),
		class: className = "",
		invalid = false,
		errorId,
		...rest
	}: Props = $props();

	const borderClass = $derived(
		invalid
			? "border-[color:var(--color-danger-border)] focus:border-[color:var(--color-danger)] focus:ring-[color:var(--color-danger)]"
			: "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]",
	);
</script>

<input
	class="block w-full min-h-[44px] rounded-[var(--radius-control)] border bg-[color:var(--color-surface-raised)] px-3 py-2.5 text-base text-[color:var(--color-fg)] shadow-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 {borderClass} {className}"
	aria-invalid={invalid ? "true" : undefined}
	aria-describedby={errorId}
	bind:value
	{...rest}
/>
