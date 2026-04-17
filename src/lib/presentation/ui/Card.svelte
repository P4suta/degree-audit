<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		children: Snippet;
		class?: string;
		padding?: "sm" | "md" | "lg" | "none";
		/**
		 * "bordered" (default) = 境界 1px + 影なし（Apple 流）
		 * "flat"     = 境界なし + 影なし（画面の背景差で区切るとき）
		 * "lifted"   = 影あり（重要な最前面カード。多用しない）
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
