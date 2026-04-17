<script lang="ts">
	import AlertTriangle from "lucide-svelte/icons/alert-triangle";
	import CircleAlert from "lucide-svelte/icons/circle-alert";
	import Info from "lucide-svelte/icons/info";
	import type { Snippet } from "svelte";

	type Variant = "info" | "warning" | "danger";

	interface Props {
		children: Snippet;
		variant?: Variant;
		title?: string;
		class?: string;
		actions?: Snippet;
	}

	const {
		children,
		variant = "info",
		title,
		class: className = "",
		actions,
	}: Props = $props();

	const variantClass = $derived.by(() => {
		switch (variant) {
			case "info":
				return "bg-[color:var(--color-surface-muted)] text-[color:var(--color-fg)] border-l-[color:var(--color-accent)]";
			case "warning":
				return "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-fg)] border-l-[color:var(--color-warning)]";
			case "danger":
				return "bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-fg)] border-l-[color:var(--color-danger)]";
		}
	});

	const Icon = $derived.by(() => {
		switch (variant) {
			case "info":
				return Info;
			case "warning":
				return AlertTriangle;
			case "danger":
				return CircleAlert;
		}
	});

	const role = $derived(variant === "danger" ? "alert" : "status");
	const ariaLive = $derived(variant === "danger" ? "assertive" : "polite");
</script>

<div
	{role}
	aria-live={ariaLive}
	class="flex items-start gap-3 rounded-[var(--radius-control)] border border-l-4 border-[color:var(--color-border)] p-3 {variantClass} {className}"
>
	<Icon class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
	<div class="flex-1 space-y-1">
		{#if title}
			<p class="text-sm font-semibold">{title}</p>
		{/if}
		<div class="text-sm">
			{@render children()}
		</div>
	</div>
	{#if actions}
		<div class="flex shrink-0 items-center gap-1">
			{@render actions()}
		</div>
	{/if}
</div>
