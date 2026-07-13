<script lang="ts">
	import { base } from "$app/paths";
	import { safeGoto } from "$lib/presentation/navigation";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
	import * as m from "$lib/paraglide/messages";
	import Button from "$lib/presentation/ui/Button.svelte";
	import Card from "$lib/presentation/ui/Card.svelte";
	import ArrowBack from "~icons/ic/round-arrow-back";

	// このページから同意しても OK にする。モーダル経由と同じ扱い
	const handleAcknowledge = () => {
		disclaimerStore.acknowledge();
		void safeGoto(`${base}/`);
	};
</script>

<svelte:head>
	<title>{m.link_disclaimer()} — {m.app_title()}</title>
</svelte:head>

<a
	href={`${base}/dashboard`}
	class="inline-flex min-h-tap touch-manipulation items-center gap-1 text-small text-[color:var(--color-accent-link)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]"
>
	<ArrowBack class="h-4 w-4" aria-hidden="true" />
	{m.back_to_dashboard()}
</a>

<header class="space-y-3">
	<h2 class="text-display text-[color:var(--color-fg)]">
		{m.link_disclaimer()}
	</h2>
	<p class="max-w-readable text-body text-[color:var(--color-fg-muted)]">
		{m.disclaimer_page_lead()}
	</p>
</header>

<Card padding="lg">
	<div
		class="space-y-6 text-small leading-relaxed text-[color:var(--color-fg)]"
	>
		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				{m.disclaimer_s1_heading()}
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s1_body()}
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				{m.disclaimer_s2_heading()}
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s2_body1_a()}
				<strong class="text-[color:var(--color-fg)]"
					>{m.disclaimer_s2_body1_strong()}</strong
				>{m.disclaimer_s2_body1_b()}
			</p>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s2_body2()}
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				{m.disclaimer_s3_heading()}
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s3_body()}
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				{m.disclaimer_s4_heading()}
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s4_body()}
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				{m.disclaimer_s5_heading()}
			</h3>
			<div
				class="rounded-[var(--radius-control)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-4 text-[color:var(--color-warning-fg)]"
			>
				<p>
					{m.disclaimer_s5_body1_a()}
					<strong>{m.disclaimer_s5_body1_strong()}</strong
					>{m.disclaimer_s5_body1_b()}
				</p>
				<ul class="mt-3 list-disc space-y-1 pl-5">
					<li>{m.disclaimer_s5_item1_a()}<strong>{m.disclaimer_s5_item1_strong()}</strong></li>
					<li>
						{m.disclaimer_s5_item2_a()}<strong>{m.disclaimer_s5_item2_strong()}</strong>{m.disclaimer_s5_item2_b()}
					</li>
					<li><strong>{m.disclaimer_s5_item3_strong()}</strong></li>
				</ul>
				<p class="mt-3">
					{m.disclaimer_s5_body2_a()}<strong>{m.disclaimer_s5_body2_strong()}</strong
					>{m.disclaimer_s5_body2_b()}
				</p>
			</div>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				{m.disclaimer_s6_heading()}
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s6_body1()}
			</p>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s6_body2()}
			</p>
		</section>

		<section class="space-y-2">
			<h3
				class="text-h3 text-[color:var(--color-fg)]"
			>
				{m.disclaimer_s7_heading()}
			</h3>
			<p class="text-[color:var(--color-fg-muted)]">
				{m.disclaimer_s7_body()}
			</p>
		</section>
	</div>
</Card>

{#if !disclaimerStore.acknowledged}
	<!--
	  未同意で /disclaimer を開いた場合（モーダル内リンクから来た等）。
	  ここから直接同意して利用を開始できる導線を出す。
	  同意済みの場合は冗長なので出さない
	-->
	<div
		class="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[color:var(--color-border)] bg-[color:var(--color-surface-alt)] p-6 text-center"
	>
		<p class="text-small text-[color:var(--color-fg-muted)]">
			{m.disclaimer_page_ack_note()}
		</p>
		<Button
			variant="primary"
			size="lg"
			class="rounded-[var(--radius-pill)] px-8"
			onclick={handleAcknowledge}
		>
			{m.disclaimer_acknowledge()}
		</Button>
	</div>
{/if}
