<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		children: Snippet;
		class?: string;
		padding?: "sm" | "md" | "lg" | "none";
		elevation?: "flat" | "raised";
	}

	const {
		children,
		class: className = "",
		padding = "md",
		elevation = "raised",
	}: Props = $props();

	const paddingClass = $derived.by(() => {
		switch (padding) {
			case "none":
				return "";
			case "sm":
				return "p-3";
			case "md":
				return "p-4 sm:p-5";
			case "lg":
				return "p-6";
		}
	});

	const elevationClass = $derived(
		elevation === "raised"
			? "shadow-[var(--shadow-card)]"
			: "",
	);
</script>

<div
	class="rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-fg)] {elevationClass} {paddingClass} {className}"
>
	{@render children()}
</div>
