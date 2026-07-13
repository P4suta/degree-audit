<script lang="ts" generics="TValue extends string | number">
	import type { Snippet } from "svelte";
	import ChevronDown from "~icons/ic/round-expand-more";
	import type { HTMLSelectAttributes } from "svelte/elements";

	// appearance-none hides the OS default arrow; <ChevronDown> is drawn on top.
	// text-base (16px) avoids iOS auto-zoom; min-h-[44px] for the tap target.
	// Generic over value type so it accepts number or string.

	interface Props extends Omit<HTMLSelectAttributes, "class" | "value" | "children"> {
		value?: TValue;
		class?: string;
		invalid?: boolean;
		errorId?: string | undefined;
		children: Snippet;
	}

	let {
		value = $bindable(),
		class: className = "",
		invalid = false,
		errorId,
		children,
		...rest
	}: Props = $props();

	const borderClass = $derived(
		invalid
			? "border-[color:var(--color-danger-border)] focus:border-[color:var(--color-danger)] focus:ring-[color:var(--color-danger)]"
			: "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]",
	);
</script>

<div class="relative">
	<select
		class="block w-full min-h-tap appearance-none rounded-[var(--radius-control)] border bg-[color:var(--color-surface-raised)] px-3 py-2.5 pr-10 text-form text-[color:var(--color-fg)] shadow-sm focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 {borderClass} {className}"
		aria-invalid={invalid ? "true" : undefined}
		aria-describedby={errorId}
		bind:value
		{...rest}
	>
		{@render children()}
	</select>
	<ChevronDown
		class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-fg-subtle)]"
		aria-hidden="true"
	/>
</div>
