<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		children: Snippet;
		class?: string;
		padding?: "sm" | "md" | "lg" | "none";
		/**
		 * "bordered" (default) = 1px border, no shadow (Apple style)
		 * "flat"     = no border, no shadow (separated by background contrast)
		 * "lifted"   = with shadow (important foreground card; use sparingly)
		 */
		variant?: "bordered" | "flat" | "lifted";
	}

	const {
		children,
		class: className = "",
		padding = "md",
		variant = "bordered",
	}: Props = $props();

	const paddingClass = $derived.by(() => {
		switch (padding) {
			case "none":
				return "";
			case "sm":
				return "p-4";
			case "md":
				return "p-5";
			case "lg":
				return "p-6 sm:p-8";
		}
	});

	const variantClass = $derived.by(() => {
		switch (variant) {
			case "bordered":
				return "border border-[color:var(--color-border)]";
			case "flat":
				return "";
			case "lifted":
				return "shadow-[var(--shadow-card)]";
		}
	});
</script>

<div
	class="rounded-[var(--radius-card)] bg-[color:var(--color-surface)] text-[color:var(--color-fg)] {variantClass} {paddingClass} {className}"
>
	{@render children()}
</div>
