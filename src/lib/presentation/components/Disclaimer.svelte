<script lang="ts">
	import { base } from "$app/paths";
	import { disclaimerStore } from "$lib/presentation/stores/disclaimer.svelte";
	import * as m from "$lib/paraglide/messages";
	import Button from "$lib/presentation/ui/Button.svelte";

	let dialogEl = $state<HTMLDialogElement>();

	// Top-layer consent gate. showModal() lifts the dialog above everything (no
	// z-index bookkeeping), traps focus, and makes the rest of the page inert —
	// all natively, replacing the former hand-written focus trap + body scroll
	// lock. It's a gate, so Esc must NOT dismiss it: swallow the `cancel` event.
	// jsdom lacks showModal(), so fall back to `open` for render tests.
	//
	// Opened a double-rAF after mount so showModal()'s forced synchronous layout
	// lands on a settled tree, not inside the mount flush.
	$effect(() => {
		const el = dialogEl;
		if (el === undefined) return;
		const open = () => {
			try {
				el.showModal();
			} catch {
				el.open = true;
			}
		};
		let raf1 = 0;
		let raf2 = 0;
		if (typeof requestAnimationFrame === "function") {
			raf1 = requestAnimationFrame(() => {
				raf2 = requestAnimationFrame(open);
			});
		} else {
			open();
		}
		return () => {
			cancelAnimationFrame?.(raf1);
			cancelAnimationFrame?.(raf2);
			try {
				el.close();
			} catch {
				el.open = false;
			}
		};
	});
</script>

<!--
  Terms-of-use (disclaimer) consent modal.

  Layout:
    - Mobile (<640px): full-viewport "sheet", no radius/border. Fills the whole
      viewport to kill the "overflows vertically" feel; safe-area-inset is added
      to padding for notch / home-bar devices.
    - Desktop (≥640px): centered max-w-modal (560px) card.

  Height prefers 100dvh (dynamic viewport height) to avoid iOS Safari's 100vh
  being larger than the real viewport while the address bar is shown.
-->
<dialog
	bind:this={dialogEl}
	class="disclaimer-dialog"
	aria-labelledby="disclaimer-title"
	aria-describedby="disclaimer-body"
	oncancel={(e) => e.preventDefault()}
>
	<div
		class="disclaimer-overlay flex items-stretch justify-center bg-[color:var(--color-overlay-backdrop)] backdrop-blur-md motion-safe:animate-fade-in sm:items-center sm:px-4 sm:py-6"
	>
		<div
			class="flex w-full flex-col bg-[color:var(--color-surface)] sm:max-h-modal sm:max-w-modal sm:rounded-[var(--radius-card)] sm:border sm:border-[color:var(--color-border)] sm:shadow-[var(--shadow-lifted)]"
		>
			<div
				class="flex-shrink-0 px-4 pb-2 pt-4 sm:p-8 sm:pb-4"
				style="padding-top: max(1rem, env(safe-area-inset-top));"
			>
				<h2 id="disclaimer-title" class="text-h2 text-[color:var(--color-fg)] sm:text-h1">
					{m.disclaimer_modal_heading()}
				</h2>
			</div>

			<div
				id="disclaimer-body"
				class="flex-1 space-y-3 overflow-y-auto px-4 text-small leading-relaxed text-[color:var(--color-fg-muted)] sm:px-8 sm:leading-relaxed"
			>
				<p>
					{m.disclaimer_modal_p1_a()}<strong
						class="text-[color:var(--color-fg)]">{m.disclaimer_modal_p1_strong()}</strong
					>{m.disclaimer_modal_p1_b()}
				</p>

				<p>
					{m.disclaimer_modal_p2_a()}<strong
						class="text-[color:var(--color-fg)]"
						>{m.disclaimer_modal_p2_strong()}</strong
					>{m.disclaimer_modal_p2_b()}
				</p>

				<p>
					{m.disclaimer_modal_p3()}
				</p>

				<p>
					{m.disclaimer_modal_p4()}
				</p>

				<p
					class="rounded-[var(--radius-control)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-3 text-[color:var(--color-warning-fg)]"
				>
					<strong>{m.disclaimer_modal_p5_strong1()}</strong>
					{m.disclaimer_modal_p5_a()}<strong>{m.disclaimer_modal_p5_strong2()}</strong>、<strong
						>{m.disclaimer_modal_p5_strong3()}</strong
					>、<strong>{m.disclaimer_modal_p5_strong4()}</strong
					>{m.disclaimer_modal_p5_b()}
				</p>

				<p>
					{m.disclaimer_modal_p6()}
				</p>
			</div>

			<div
				class="flex-shrink-0 border-t border-[color:var(--color-divider)] px-4 py-4 sm:border-t-0 sm:p-8 sm:pt-4"
				style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
			>
				<Button
					variant="primary"
					size="lg"
					class="w-full rounded-[var(--radius-pill)]"
					autofocus
					onclick={() => disclaimerStore.acknowledge()}
				>
					{m.disclaimer_acknowledge()}
				</Button>
				<p
					class="mt-2 text-center text-caption text-[color:var(--color-fg-subtle)] sm:mt-3"
				>
					{m.disclaimer_modal_footnote_lead()} <a
						href={`${base}/disclaimer`}
						class="underline hover:text-[color:var(--color-accent-link)]"
						>{m.disclaimer_full_link()}</a
					> {m.disclaimer_modal_footnote_trail()}
				</p>
			</div>
		</div>
	</div>
</dialog>
