<script lang="ts">
	import type { Snippet } from "svelte";

	type Variant = "success" | "warning" | "danger" | "neutral" | "accent";

	interface Props {
		children: Snippet;
		variant?: Variant;
		class?: string;
	}

	const { children, variant = "neutral", class: className = "" }: Props =
		$props();

	const variantClass = $derived.by(() => {
		switch (variant) {
			case "success":
				return "bg-[color:var(--color-success-bg)] text-[color:var(--color-success-fg)] border-[color:var(--color-success-border)]";
			case "warning":
				return "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)] border-[color:var(--color-warning-border)]";
			case "danger":
				return "bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] border-[color:var(--color-danger-border)]";
			case "accent":
				return "bg-[color:var(--color-surface-muted)] text-[color:var(--color-accent)] border-[color:var(--color-border)]";
			case "neutral":
				return "bg-[color:var(--color-surface-muted)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]";
		}
	});
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium {variantClass} {className}"
>
	{@render children()}
</span>
