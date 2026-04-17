<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	type Variant = "primary" | "secondary" | "danger" | "ghost";
	type Size = "sm" | "md" | "lg";

	interface Props extends Omit<HTMLButtonAttributes, "class"> {
		children: Snippet;
		variant?: Variant;
		size?: Size;
		class?: string;
	}

	const {
		children,
		variant = "primary",
		size = "md",
		class: className = "",
		type = "button",
		...rest
	}: Props = $props();

	const variantClass = $derived.by(() => {
		switch (variant) {
			case "primary":
				return "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] hover:bg-[color:var(--color-accent-hover)] border-transparent";
			case "secondary":
				return "bg-[color:var(--color-surface-raised)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-surface-muted)] border-[color:var(--color-border)]";
			case "danger":
				return "bg-[color:var(--color-danger)] text-[color:var(--color-accent-fg)] hover:opacity-90 border-transparent";
			case "ghost":
				return "bg-transparent text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-surface-muted)] border-transparent";
		}
	});

	const sizeClass = $derived.by(() => {
		switch (size) {
			case "sm":
				return "px-2.5 py-1 text-xs";
			case "md":
				return "px-3.5 py-2 text-sm";
			case "lg":
				return "px-5 py-2.5 text-base";
		}
	});
</script>

<button
	{type}
	class="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] border font-medium motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50 {variantClass} {sizeClass} {className}"
	{...rest}
>
	{@render children()}
</button>
