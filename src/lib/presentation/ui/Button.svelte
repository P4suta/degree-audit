<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type Variant = "primary" | "secondary" | "pill" | "ghost" | "danger";
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
				return "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] border-transparent hover:bg-[color:var(--color-accent-hover)]";
			case "secondary":
				return "bg-[color:var(--color-surface)] text-[color:var(--color-fg)] border-[color:var(--color-border)] hover:bg-[color:var(--color-surface-alt)]";
			case "pill":
				// Apple の "Learn more" 風。pill 形状 + accent-link テキスト
				return "bg-transparent text-[color:var(--color-accent-link)] border-[color:var(--color-accent-link)] hover:bg-[color:var(--color-accent-ring)]";
			case "ghost":
				return "bg-transparent text-[color:var(--color-fg-muted)] border-transparent hover:bg-[color:var(--color-divider)]";
			case "danger":
				return "bg-[color:var(--color-danger)] text-white border-transparent hover:opacity-90";
		}
	});

	// サイズは WCAG / iOS HIG / Material の推奨に沿って：
	//   sm=32px（副次操作・密度優先のセカンダリ）
	//   md=44px（主要操作・iOS HIG の最小タップ推奨値）
	//   lg=52px（CTA・「本気の同意」用。Disclaimer の同意ボタン等）
	// min-h で下限を保証し、padding は line-height + min-h で決まる視覚高さの調整用。
	const sizeClass = $derived.by(() => {
		switch (size) {
			case "sm":
				return "min-h-[32px] px-3 py-1.5 text-[13px]";
			case "md":
				return "min-h-[44px] px-4 py-2.5 text-[15px]";
			case "lg":
				return "min-h-[52px] px-6 py-3 text-base";
		}
	});

	const radiusClass = $derived(
		variant === "pill" ? "rounded-[var(--radius-pill)]" : "rounded-[var(--radius-md)]",
	);
</script>

<button
	{type}
	class="inline-flex touch-manipulation items-center justify-center gap-1.5 border font-normal motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)] disabled:cursor-not-allowed disabled:opacity-50 {variantClass} {sizeClass} {radiusClass} {className}"
	{...rest}
>
	{@render children()}
</button>
