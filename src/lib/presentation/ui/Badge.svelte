<script lang="ts">
	import type { Snippet } from "svelte";

	/**
	 * Five variants: success / warning / danger / neutral / accent.
	 * DESIGN.md reserves accent (blue) for interactive elements, so the accent
	 * variant stays a restrained info label, not something that looks clickable.
	 */
	type Variant = "success" | "warning" | "danger" | "neutral" | "accent";

	interface Props {
		children: Snippet;
		variant?: Variant;
		class?: string;
		/** Pill radius instead of the default chip (4px). */
		pill?: boolean;
		/** Show a leading variant-colored status dot. */
		dot?: boolean;
	}

	const {
		children,
		variant = "neutral",
		class: className = "",
		pill = false,
		dot = false,
	}: Props = $props();

	const variantClass = $derived.by(() => {
		switch (variant) {
			case "success":
				return "bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)] border-[color:var(--color-success-border)]";
			case "warning":
				return "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)] border-[color:var(--color-warning-border)]";
			case "danger":
				return "bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] border-[color:var(--color-danger-border)]";
			case "accent":
				return "bg-[color:var(--color-accent-ring)] text-[color:var(--color-accent-link)] border-transparent";
			case "neutral":
				return "bg-[color:var(--color-surface-alt)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]";
		}
	});

	const radiusClass = $derived(
		pill ? "rounded-[var(--radius-pill)]" : "rounded-[var(--radius-chip)]",
	);
</script>

<span
	class="inline-flex items-center gap-1.5 border px-2 py-0.5 text-caption font-medium leading-none {variantClass} {radiusClass} {className}"
>
	{#if dot}
		<span
			class="h-1.5 w-1.5 shrink-0 rounded-[var(--radius-pill)] bg-current"
			aria-hidden="true"
		></span>
	{/if}
	{@render children()}
</span>
