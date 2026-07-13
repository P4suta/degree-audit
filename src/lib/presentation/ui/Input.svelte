<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";

	// DESIGN.md sets body text at 15px, but form fields force text-base (16px)
	// to avoid iOS Safari's focus auto-zoom (triggered below 16px).
	//
	// min-h-[44px] is the iOS HIG / Material minimum tap target.
	// value is received via Svelte 5 `bindable` since two-way bind:value is common.

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
	class="block w-full min-h-tap rounded-[var(--radius-control)] border bg-[color:var(--color-surface-raised)] px-3 py-2.5 text-form text-[color:var(--color-fg)] shadow-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 {borderClass} {className}"
	aria-invalid={invalid ? "true" : undefined}
	aria-describedby={errorId}
	bind:value
	{...rest}
/>
