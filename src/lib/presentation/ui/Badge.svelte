<script lang="ts">
	import type { Snippet } from "svelte";

	/**
	 * Badge の色は success / warning / danger / neutral / accent の 5 種。
	 * DESIGN.md のルール「accent（青）はインタラクティブ要素専用」を徹底するため、
	 * accent バリアントは「他と同じ見た目の強調バッジ」として控えめに扱う
	 * （実際にリンクやボタンに化けるわけではない情報ラベルとして）。
	 */
	type Variant = "success" | "warning" | "danger" | "neutral" | "accent";

	interface Props {
		children: Snippet;
		variant?: Variant;
		class?: string;
		/** 角丸を pill にする（デフォルトは micro 4px） */
		pill?: boolean;
	}

	const {
		children,
		variant = "neutral",
		class: className = "",
		pill = false,
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
		pill ? "rounded-[var(--radius-pill)]" : "rounded-[var(--radius-micro)]",
	);
</script>

<span
	class="inline-flex items-center gap-1 border px-2 py-0.5 text-xs font-medium leading-none {variantClass} {radiusClass} {className}"
>
	{@render children()}
</span>
