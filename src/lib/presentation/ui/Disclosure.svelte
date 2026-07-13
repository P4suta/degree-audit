<script lang="ts">
	import type { Snippet } from "svelte";
	import ChevronRight from "~icons/ic/round-chevron-right";

	/**
	 * Progressive disclosure: a thin skin over native <details>/<summary>.
	 * Expand state, keyboard, and screen-reader announcements are left to the
	 * browser (a11y for free). Use it to fold advanced detail under the essentials.
	 */
	interface Props {
		readonly title: string;
		/** Optional count shown at the right of the heading. */
		readonly count?: number | undefined;
		/** Whether it starts expanded. */
		readonly open?: boolean;
		readonly children: Snippet;
	}

	const { title, count, open = false, children }: Props = $props();
</script>

<details
	{open}
	class="group overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
>
	<summary
		class="flex min-h-tap cursor-pointer list-none items-center gap-2 px-4 py-3 text-body-emph text-[color:var(--color-fg)] motion-safe:transition-colors hover:bg-[color:var(--color-overlay-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-accent)] [&::-webkit-details-marker]:hidden"
	>
		<ChevronRight
			class="h-5 w-5 shrink-0 text-[color:var(--color-fg-subtle)] motion-safe:transition-transform group-open:rotate-90"
			aria-hidden="true"
		/>
		<span class="flex-1">{title}</span>
		{#if count !== undefined}
			<span
				class="shrink-0 text-caption tabular-nums text-[color:var(--color-fg-subtle)]"
			>
				{count}
			</span>
		{/if}
	</summary>
	<div
		class="space-y-4 border-t border-[color:var(--color-divider)] px-4 py-4"
	>
		{@render children()}
	</div>
</details>
